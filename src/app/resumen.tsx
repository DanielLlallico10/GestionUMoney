import { StyleSheet, Text, View } from 'react-native';

export default function ResumenScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.texto}>Pantalla de Estadísticas (En construcción)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  texto: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }
});