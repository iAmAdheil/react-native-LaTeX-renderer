import { type ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import makeWebshell, {
  HandleHTMLDimensionsFeature,
  useAutoheight,
} from '@formidable-webview/webshell';

const Webshell = makeWebshell(WebView, new HandleHTMLDimensionsFeature());
export type WebshellProps = ComponentProps<typeof Webshell>;
const globalStyles = StyleSheet.create({
  webview: { backgroundColor: 'transparent' },
});

function MinimalAutoheightWebView(webshellProps: WebshellProps) {
  const { autoheightWebshellProps } = useAutoheight({
    webshellProps,
  });
  return <Webshell {...autoheightWebshellProps} />;
}

const LatexRenderer = ({
  content,
  containerStyles,
  textStyles,
  mathContainerStyles,
}: {
  content: string;
  containerStyles?: string;
  textStyles?: string;
  mathContainerStyles?: string;
}) => {
  const htmlSource = src(
    content,
    containerStyles || '',
    textStyles || '',
    mathContainerStyles || ''
  );

  return (
    <MinimalAutoheightWebView
      source={{ html: htmlSource }}
      style={globalStyles.webview}
    />
  );
};

const src = (
  content: string,
  containerStyles: string,
  textStyles: string,
  mathContainerStyles: string
) => {
  const setStyles = getStyles(containerStyles, textStyles, mathContainerStyles);
  return `
		<!DOCTYPE html>
		<html>
			<head>
				${setStyles}
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
					${content}
				</div>
			</body>
		</html>
	`;
};

const getStyles = (
  containerStyles: string,
  textStyles: string,
  mathContainerStyles: string
) => {
  return `
    <style>
      #container {
        width: 100% !important;
        background-color: transparent !important;
        ${containerStyles}
      }

      p, span, div {
        background-color: transparent !important;
        color: black !important;
        font-size: 30px !important;
        ${textStyles}
      }

      .katex {
        max-width: 100%;
        white-space: normal !important;
        overflow-wrap: break-word !important;
        flex-wrap: wrap !important;
        background-color: transparent !important;
        ${mathContainerStyles}
      }
    </style>
  `;
};

export default LatexRenderer;
