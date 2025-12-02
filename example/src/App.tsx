import { KaTeXAutoHeightWebView, createKaTeXHTML } from '../../src/index';
import { Text, View, StyleSheet } from 'react-native';

export default function HomeScreen() {
  const src = createKaTeXHTML(
    'This is me using latex inside webshells $$ \\frac{1}{2} $$ This is me using latex inside webshells $$ \\frac{1}{2} $$',
    'font-size: 50px !important;'
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Demo App</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  title: {
    fontSize: 40,
    marginBottom: 20,
  },
});
