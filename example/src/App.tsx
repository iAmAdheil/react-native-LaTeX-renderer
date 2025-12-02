import { KaTeXAutoHeightWebView, createKaTeXHTML } from '../../src/index';
import { View, StyleSheet } from 'react-native';

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
    {
      'width': '50%',
      'font-size': '40px',
    },
    {
      color: 'blue',
    }
  );

  return (
    <View style={styles.container}>
      <KaTeXAutoHeightWebView
        source={src}
        onHeightChange={(height) => console.log('New height:', height)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 80,
  },
});
