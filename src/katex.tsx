import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type LatexStyle =
  | 'border'
  | 'font-size'
  | 'line-height'
  | 'color'
  | 'background-color';
type LatexStyleMap = Partial<Record<LatexStyle, string>>;

type InnerContainerStyle =
  | 'padding'
  | 'border'
  | 'font-size'
  | 'line-height'
  | 'width'
  | 'height'
  | 'color'
  | 'background-color';
type InnerContainerMap = Partial<Record<InnerContainerStyle, string>>;

type ContainerStyle =
  | 'padding'
  | 'width'
  | 'backgroundColor'
  | 'borderWidth'
  | 'borderColor';
type ContainerMap = Partial<Record<ContainerStyle, string>>;

const HEIGHT_CALCULATION_SCRIPT = `
  (function() {
    let lastSentHeight = 0;
    let rafId = null;
    const HEIGHT_THRESHOLD = 5;

    const calculateHeight = () => {
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );

      const bodyRect = document.body.getBoundingClientRect();
      const rectHeight = bodyRect.height + window.pageYOffset;

      return Math.max(scrollHeight, rectHeight);
    };

    const sendHeightUpdate = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        try {
          const height = calculateHeight();

          if (Math.abs(height - lastSentHeight) > HEIGHT_THRESHOLD) {
            lastSentHeight = height;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'height',
              height: Math.ceil(height),
              timestamp: Date.now()
            }));
          }
        } catch (error) {
          console.error('Height calculation error:', error);
        }
        rafId = null;
      });
    };

    const setupObservers = () => {
      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
          sendHeightUpdate();
        });

        resizeObserver.observe(document.body);
        resizeObserver.observe(document.documentElement);

        setTimeout(() => {
          const katexElements = document.querySelectorAll('.katex-display, .katex');
          katexElements.forEach(el => {
            try {
              resizeObserver.observe(el);
            } catch (e) {
              // Element might not be valid, skip
            }
          });
        }, 100);

        return;
      }

      const mutationObserver = new MutationObserver(() => {
        sendHeightUpdate();
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
        characterData: false,
      });

      window.addEventListener('resize', sendHeightUpdate);
    };

    const initialize = () => {
      setupObservers();

      sendHeightUpdate();
      setTimeout(sendHeightUpdate, 100);
      setTimeout(sendHeightUpdate, 300);
    };

    initialize();

    return true;
  })();
  true; // Required for iOS
`;

const KaTeXAutoHeightWebView = ({
  source,
  onHeightChange,
  minHeight = 50,
  containerStyle,
  ...webViewProps
}: {
  source: string;
  onHeightChange?: (height: number) => void;
  minHeight?: number;
  containerStyle?: ContainerMap;
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
    <View
      style={[
        styles.container,
        { height },
        containerStyle &&
          Object.entries(containerStyle).reduce(
            (acc: Record<string, any>, [key, value]) => {
              if (
                typeof value === 'string' &&
                key.includes('borderWidth') &&
                !isNaN(parseFloat(value))
              ) {
                acc[key] = parseFloat(value);
              } else {
                acc[key] = value;
              }
              return acc;
            },
            {} as Record<string, any>
          ),
      ]}
    >
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
    backgroundColor: 'transparent',
  },
  webview: {
    backgroundColor: 'transparent',
  },
});

const createKaTeXHTML = (
  latexContent: string,
  containerStyles?: InnerContainerMap,
  latexStyles?: LatexStyleMap
) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * {
            margin: 0 !important;
            padding: 0 !important;
          }

          #outer-wrapper {
            ${Object.entries(formatContainerStyles(containerStyles))
              .map(([key, value]) => {
                const cssKey = key
                  .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
                  .toLowerCase();
                return `${cssKey}: ${value};`;
              })
              .join('\n')}
          }

          #container {
            width: 100% !important;
            box-sizing: border-box !important;
            background-color: transparent !important;
          }

          .katex-display {
            overflow-x: auto !important;
            overflow-y: visible !important;
          }

          .katex-html {
            max-width: 100% !important;
            overflow-x: auto !important;
          }

          .katex {
            flex-wrap: wrap !important;
            overflow-wrap: break-word !important;
            max-width: 100% !important;
            white-space: normal !important;

            ${Object.entries(formatLatexStyles(latexStyles))
              .map(([key, value]) => {
                const cssKey = key
                  .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
                  .toLowerCase();
                return `${cssKey}: ${value};`;
              })
              .join('\n')}
          }
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
        <div id="outer-wrapper">
          <div id="container">
            ${latexContent}
          </div>
        </div>
      </body>
    </html>
  `;
};

const formatContainerStyles = (s?: InnerContainerMap) => {
  let initialStyles = {
    'font-family':
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'font-size': '16px',
    'line-height': '1.6',
    'padding': '8px',
    'background-color': 'transparent',
    'color': 'black',
  };

  if (!s || typeof s !== 'object' || Array.isArray(s)) {
    return {};
  }

  Object.entries(s).forEach(([key, value]) => {
    initialStyles[key as keyof typeof initialStyles] = value;
  });

  return initialStyles;
};

const formatLatexStyles = (s?: LatexStyleMap) => {
  let initialStyles = {
    'color': 'black',
    'font-size': '1em',
    'line-height': '2',
  };

  if (!s || typeof s !== 'object' || Array.isArray(s)) {
    return {};
  }

  Object.entries(s).forEach(([key, value]) => {
    initialStyles[key as keyof typeof initialStyles] = value;
  });

  return initialStyles;
};

export { KaTeXAutoHeightWebView, createKaTeXHTML };
