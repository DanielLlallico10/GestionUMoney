import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [esRegistro, setEsRegistro] = useState(false);

  const manejarAutenticacion = async () => {
    if (!email || !password) {
      Alert.alert('Campos incompletos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setCargando(true);

    if (esRegistro) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        Alert.alert('Error al registrarse', error.message);
      } else {
        Alert.alert('¡Cuenta creada!', 'Te hemos registrado con éxito. Ya puedes iniciar sesión.');
        setEsRegistro(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        Alert.alert('Error al ingresar', error.message);
      } else {
        onLoginSuccess();
      }
    }

    setCargando(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../app/Assets/Cerdito.png')} style={styles.logo} />
        <Text style={styles.titulo}>GestionUMoney 2.0</Text>
        <Text style={styles.subtitulo}>{esRegistro ? 'Crea tu cuenta de ahorros' : 'Bienvenido de vuelta'}</Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.botonPrincipal} onPress={manejarAutenticacion} disabled={cargando}>
          <Text style={styles.textoBoton}>{cargando ? 'Cargando...' : esRegistro ? 'Registrarse' : 'Iniciar Sesión'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setEsRegistro(!esRegistro)} style={styles.toggleBtn}>
          <Text style={styles.toggleTexto}>
            {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', backgroundColor: '#1e293b', borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: '#4c1d95' },
  logo: { width: 90, height: 90, resizeMode: 'contain', marginBottom: 10 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  subtitulo: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
  input: { width: '100%', backgroundColor: '#0f172a', color: '#ffffff', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#4c1d95' },
  botonPrincipal: { width: '100%', backgroundColor: '#8b5cf6', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  textoBoton: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  toggleBtn: { marginTop: 18 },
  toggleTexto: { color: '#38bdf8', fontSize: 13, textDecorationLine: 'underline' }
});