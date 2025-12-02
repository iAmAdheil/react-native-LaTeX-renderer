import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * Comprehensive height calculation script for WebView
 * Handles multiple height calculation methods with special support for KaTeX
 */
const HEIGHT_CALCULATION_SCRIPT = `
  (function() {
    // Track last sent height to prevent feedback loops
    let lastSentHeight = 0;
    let updateTimer = null;
    const HEIGHT_THRESHOLD = 5; // Only update if change is > 5px
    
    // Multiple height calculation strategies
    const heightCalculators = {
      // Method 1: scrollHeight (most common)
      scrollHeight: () => Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ),
      
      // Method 2: offsetHeight (includes borders)
      offsetHeight: () => Math.max(
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      ),
      
      // Method 3: clientHeight (excludes scrollbars)
      clientHeight: () => Math.max(
        document.body.clientHeight,
        document.documentElement.clientHeight
      ),
      
      // Method 4: getBoundingClientRect (most accurate for rendered content)
      boundingRect: () => {
        const bodyRect = document.body.getBoundingClientRect();
        const htmlRect = document.documentElement.getBoundingClientRect();
        return Math.max(bodyRect.height, htmlRect.height);
      },
      
      // Method 5: Deep scan - useful for absolutely positioned elements
      deepScan: () => {
        let maxBottom = 0;
        const elements = document.querySelectorAll('*');
        
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const bottom = rect.bottom + window.pageYOffset;
          if (bottom > maxBottom) maxBottom = bottom;
        });
        
        return maxBottom;
      }
    };

    /**
     * KaTeX-specific height calculation
     * KaTeX elements can have complex rendering with spans, scripts, and positioning
     */
    const calculateKaTeXHeight = () => {
      // Find all KaTeX elements
      const katexElements = document.querySelectorAll('.katex, .katex-display, .katex-html');
      
      if (katexElements.length === 0) {
        return null; // No KaTeX elements found
      }
      
      let maxKatexBottom = 0;
      
      katexElements.forEach(katex => {
        // Use getBoundingClientRect for accurate rendered height
        const rect = katex.getBoundingClientRect();
        
        // Account for transforms and scaling in KaTeX
        const computedStyle = window.getComputedStyle(katex);
        const transform = computedStyle.transform;
        
        // Calculate bottom position accounting for scroll
        let bottom = rect.bottom + window.pageYOffset;
        
        // Check for superscripts, subscripts, and fractions which can extend bounds
        const struts = katex.querySelectorAll('.strut, .vlist, .mfrac');
        struts.forEach(strut => {
          const strutRect = strut.getBoundingClientRect();
          const strutBottom = strutRect.bottom + window.pageYOffset;
          if (strutBottom > bottom) bottom = strutBottom;
        });
        
        if (bottom > maxKatexBottom) maxKatexBottom = bottom;
      });
      
      return maxKatexBottom;
    };

    /**
     * Calculate the most accurate height
     */
    const calculateOptimalHeight = () => {
      const heights = {
        scrollHeight: heightCalculators.scrollHeight(),
        offsetHeight: heightCalculators.offsetHeight(),
        clientHeight: heightCalculators.clientHeight(),
        boundingRect: heightCalculators.boundingRect(),
        deepScan: heightCalculators.deepScan(),
        katexHeight: calculateKaTeXHeight()
      };
      
      // Filter out null values and use maximum
      const validHeights = Object.values(heights).filter(h => h !== null && h > 0);
      const maxHeight = Math.max(...validHeights);
      
      // Only add buffer on first calculation to prevent feedback loop
      const buffer = lastSentHeight === 0 ? 10 : 0;
      
      return Math.ceil(maxHeight + buffer);
    };

    /**
     * Send height update to React Native (debounced with threshold)
     */
    const sendHeightUpdate = () => {
      // Clear any pending updates
      clearTimeout(updateTimer);
      
      // Debounce: wait 150ms before sending
      updateTimer = setTimeout(() => {
        try {
          const height = calculateOptimalHeight();
          
          // Only send if height changed significantly (prevents feedback loop)
          if (Math.abs(height - lastSentHeight) > HEIGHT_THRESHOLD) {
            lastSentHeight = height;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'height',
              height: height,
              timestamp: Date.now()
            }));
          }
        } catch (error) {
          console.error('Height calculation error:', error);
        }
      }, 150);
    };

    /**
     * Setup observers for dynamic content changes
     */
    const setupObservers = () => {
      // ResizeObserver - most efficient for size changes
      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
          sendHeightUpdate();
        });
        
        resizeObserver.observe(document.body);
        
        // Also observe KaTeX elements specifically
        const katexElements = document.querySelectorAll('.katex, .katex-display');
        katexElements.forEach(el => resizeObserver.observe(el));
      }
      
      // MutationObserver - for DOM changes (KaTeX often renders async)
      const mutationObserver = new MutationObserver(() => {
        sendHeightUpdate();
      });
      
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      
      // Load events for images and iframes
      window.addEventListener('load', sendHeightUpdate);
      
      // Special handler for KaTeX rendering completion
      // KaTeX may render asynchronously
      const checkKaTeXRendered = () => {
        const katexElements = document.querySelectorAll('.katex');
        if (katexElements.length > 0) {
          sendHeightUpdate();
        }
      };
      
      // Check periodically for first 2 seconds (KaTeX render time)
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkKaTeXRendered();
        checkCount++;
        if (checkCount > 20) clearInterval(checkInterval); // Stop after 2 seconds
      }, 100);
    };

    // Initialize
    setupObservers();
    
    // Initial height calculation (with delay for KaTeX)
    setTimeout(sendHeightUpdate, 50);
    setTimeout(sendHeightUpdate, 200);
    setTimeout(sendHeightUpdate, 500);
    
    return true;
  })();
  true; // Required for iOS
`;

/**
 * Auto-height WebView component optimized for KaTeX content
 */
const KaTeXAutoHeightWebView = ({
  source,
  onHeightChange,
  minHeight = 50,
  style,
  ...webViewProps
}: {
  source: string;
  onHeightChange?: (height: number) => void;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
  [key: string]: any;
}) => {
  const [height, setHeight] = useState(minHeight);
  const webViewRef = useRef(null);
  const lastHeightRef = useRef(minHeight);

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === 'height' && data.height) {
          const newHeight = Math.max(data.height, minHeight);

          // Only update if height changed significantly (avoid unnecessary re-renders)
          if (Math.abs(newHeight - lastHeightRef.current) > 1) {
            lastHeightRef.current = newHeight;
            setHeight(newHeight);

            if (onHeightChange) {
              onHeightChange(newHeight);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing WebView message:', error);
      }
    },
    [minHeight, onHeightChange]
  );

  return (
    <View style={[styles.container, { height }, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: source }}
        injectedJavaScript={HEIGHT_CALCULATION_SCRIPT}
        onMessage={handleMessage}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        {...webViewProps}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'red',
  },
  webview: {
    backgroundColor: 'transparent',
  },
});

/**
 * Example HTML template with KaTeX
 */
const createKaTeXHTML = (latexContent: string, customCSS: string = '') => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            padding: 16px;
            overflow-x: hidden;
          }
          
          /* Ensure KaTeX elements are properly contained */
          .katex-display {
            margin: 1em 0;
            overflow-x: auto;
            overflow-y: visible;
          }
          
          .katex {
            font-size: 1.21em;
            max-width: 100%;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            flex-wrap: wrap !important;
          }
          
          /* Prevent horizontal overflow */
          .katex-html {
            max-width: 100%;
            overflow-x: auto;
          }
          
          ${customCSS}
        </style>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css" integrity="sha384-5TcZemv2l/9On385z///+d7MSYlvIEw9FuZTIdZ14vJLqWphw7e7ZPuOiCHJcFCP" crossorigin="anonymous">
				<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js" integrity="sha384-cMkvdD8LoxVzGF/RPUKAcvmm49FQ0oxwDF3BGKtDXcEc+T1b2N+teh/OJfpU0jr6" crossorigin="anonymous"></script>
				<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/contrib/auto-render.min.js" integrity="sha384-hCXGrW6PitJEwbkoStFjeJxv+fSOOQKOPbJxSfM6G5sWZjAyWhXiTIIAmQqnlLlh" crossorigin="anonymous"></script>
				<script>
					document.addEventListener("DOMContentLoaded", function() {
						renderMathInElement(document.body, {
							delimiters: [
								{left: '$$', right: '$$', display: true},
								{left: '$', right: '$', display: false},
								{left: '\\(', right: '\\)', display: false},
								{left: '\\[', right: '\\]', display: true}
							],					
							throwOnError : false
						});
					});
				</script>
      </head>
      <body>
        <div id="container">
          ${latexContent}
        </div>
      </body>
    </html>
  `;
};

// Export for use
export { KaTeXAutoHeightWebView, createKaTeXHTML };

// Usage example:
/*
import { KaTeXAutoHeightWebView, createKaTeXHTML } from './KaTeXAutoHeightWebView';

const MyComponent = () => {
  const latexContent = `
    <h2>Quadratic Formula</h2>
    <p>The solutions to $ax^2 + bx + c = 0$ are:</p>
    $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
    
    <p>Another example with fractions:</p>
    $$\\frac{d}{dx}\\left(\\frac{1}{x}\\right) = -\\frac{1}{x^2}$$
  `;
  
  const html = createKaTeXHTML(latexContent);
  
  return (
    <KaTeXAutoHeightWebView
      source={html}
      onHeightChange={(height) => console.log('New height:', height)}
    />
  );
};
*/
