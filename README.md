# React Native Latex Renderer

A lightweight, auto-resizing LaTeX renderer for React Native using [KaTeX](https://katex.org/).

## Features

*   **Auto-resizing**: Automatically adjusts height based on content.
*   **KaTeX Support**: Fast and reliable math rendering.
*   **Customizable**: Extensive styling options for container, text, and math elements.
*   **TypeScript Support**: Fully typed for better development experience.

## Installation

```sh
npm install @adheil_gupta/react-native-latex-renderer
```

## Usage

Pass content as a string with math equations wrapped with:

- `$ ... $` -> to display inline math
- `$$ ... $$` -> to display the equation on a new line

### Simple Example

```js
import { KaTeXAutoHeightWebView, createKaTeXHTML } from '@adheil_gupta/react-native-latex-renderer';
import { StyleSheet, View } from 'react-native';

const testing = `
  This is a test latex equation:
  $$
  I(\\lambda)
  =
  \\int_0^{\\infty} e^{-\\lambda x^2}\\cos(x)\\,dx
  \\sim
  \\sum_{k=0}^{\\infty}
  \\frac{(-1)^k (2k)!}{2^{2k+1} k!}
  \\lambda^{-k-\\tfrac12}
  $$
  End of test latex equation.
`;

export default function HomeScreen() {
  const src = createKaTeXHTML(
    testing,
    // HTML Container Styles
    {
      width: '80%',
      'padding': '15px',
      'font-size': '18px',
      'color': 'pink',      
      'background-color': 'purple',      
    },
    // LaTeX Specific Styles
    {
      border: '2px solid red',
      'color': 'lawngreen',
      'background-color': 'blue',      
    }
  );

  return (
    <View style={styles.container}>
      <KaTeXAutoHeightWebView
        source={src}
        onHeightChange={(height) => console.log('New height:', height)}
        containerStyle={{
          width: '100%',
          backgroundColor: 'yellow',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 100,
  },
});
```

### Example Result

<img src="https://res.cloudinary.com/dzaj1xdgz/image/upload/v1765365968/Screenshot_2025-12-10_at_4.52.50_PM_dfmgij.png" alt="Example Result" width="300" />

## API Reference

### `createKaTeXHTML(content, containerStyles, latexStyles)`

Generates the HTML source string for the WebView.

| Parameter | Type | Description |
|---|---|---|
| `content` | `string` | The text content containing LaTeX delimiters. |
| `containerStyles` | `object` | Styles for the HTML container (font, padding, color, etc.). |
| `latexStyles` | `object` | Styles specifically applied to KaTeX elements. |

### `KaTeXAutoHeightWebView`

The main component that renders the LaTeX content.

| Prop | Type | Default | Description |
|---|---|---|---|
| `source` | `string` | - | The HTML string returned by `createKaTeXHTML`. |
| `onHeightChange` | `(height: number) => void` | - | Callback fired when content height changes. |
| `minHeight` | `number` | `50` | Minimum height of the WebView. |
| `containerStyle` | `object` | - | Styles for the outer React Native View. |
| `...props` | `WebViewProps` | - | Any other props accepted by `react-native-webview`. |

## Styling

You can style the component at three levels:

1.  **React Native Container**: Using the `containerStyle` prop on `<KaTeXAutoHeightWebView />`.
2.  **HTML Content**: Using the second argument of `createKaTeXHTML`. Supports standard CSS properties like `font-size`, `color`, `padding`, `line-height`.
3.  **LaTeX Elements**: Using the third argument of `createKaTeXHTML`. Styles applied directly to `.katex` elements.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT
