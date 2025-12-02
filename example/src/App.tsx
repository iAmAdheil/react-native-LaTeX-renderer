import { Latex } from '../../src/index';
import { Text, View, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Demo App</Text>
      <View
        style={{
          width: '100%',
          // height: '100%',
          // flex: 1,
          backgroundColor: 'red',
        }}
      >
        <Latex
          content="This is me using latex inside webshells $$ \frac{1}{2} $$"
          textStyles="
            font-size: 50px !important;
          "
        />
      </View>
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
