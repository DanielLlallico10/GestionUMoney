import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

const TEMAS = {
  morado: { nombre: 'Morado', primario: '#8b5cf6', fondoHeader: '#7c3aed', fondoApp: '#0f172a', cardBg: '#1e293b', inputBg: '#0f172a', bordeColor: '#4c1d95' },
  verde: { nombre: 'Verde', primario: '#10b981', fondoHeader: '#059669', fondoApp: '#064e3b', cardBg: '#065f46', inputBg: '#022c22', bordeColor: '#047857' },
  gris: { nombre: 'Gris', primario: '#64748b', fondoHeader: '#475569', fondoApp: '#0f172a', cardBg: '#1e293b', inputBg: '#0f172a', bordeColor: '#334155' },
  amarillo: { nombre: 'Amarillo', primario: '#f59e0b', fondoHeader: '#d97706', fondoApp: '#1c1917', cardBg: '#292524', inputBg: '#1c1917', bordeColor: '#78350f' }
};

// COMPONENTE NUEVO: Anillo de progreso 100% fluido y matemático
const AnilloProgreso = ({ porcentaje, colorPrimario, colorFondo, colorInterior, children }: any) => {
  const size = 220;
  const stroke = 8;
  const radius = size / 2;
  const grados = Math.min(Math.max(porcentaje, 0), 100) * 3.6;
  
  const rotacionDerecha = Math.min(grados, 180);
  const rotacionIzquierda = Math.max(grados - 180, 0);

  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: colorFondo, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
      
      {/* Mitad Derecha */}
      <View style={{ position: 'absolute', width: radius, height: size, left: radius, overflow: 'hidden' }}>
        <View style={{ 
          width: size, height: size, borderRadius: radius, overflow: 'hidden', position: 'absolute', left: -radius,
          transform: [{ rotate: `${rotacionDerecha}deg` }]
        }}>
          <View style={{ position: 'absolute', width: radius, height: size, left: 0, backgroundColor: colorPrimario }} />
        </View>
      </View>

      {/* Mitad Izquierda */}
      <View style={{ position: 'absolute', width: radius, height: size, left: 0, overflow: 'hidden' }}>
        <View style={{ 
          width: size, height: size, borderRadius: radius, overflow: 'hidden', position: 'absolute', left: 0,
          transform: [{ rotate: `${rotacionIzquierda}deg` }]
        }}>
          <View style={{ position: 'absolute', width: radius, height: size, left: radius, backgroundColor: colorPrimario }} />
        </View>
      </View>

      {/* Hueco Central */}
      <View style={{ width: size - stroke * 2, height: size - stroke * 2, borderRadius: radius - stroke, backgroundColor: colorInterior, justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const [transacciones, setTransacciones] = useState<any[]>([]);
  
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Transporte');
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState('');
  const [emojiPersonalizado, setEmojiPersonalizado] = useState('📌');

  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [filtrandoPorFecha, setFiltrandoPorFecha] = useState(false);

  // Navegación inferior (0: Home, 2: Ahorros)
  const [tabActiva, setTabActiva] = useState(0);

  // Modal central tipo globo para el botón (+)
  const [modalMasVisible, setModalMasVisible] = useState(false);

  // Meta de ahorro
  const [metaAhorro, setMetaAhorro] = useState<number>(100);
  const [modalMetaVisible, setModalMetaVisible] = useState(false);
  const [nuevaMetaInput, setNuevaMetaInput] = useState('');

  const [temaActual, setTemaActual] = useState<keyof typeof TEMAS>('morado');
  const [modalColoresVisible, setModalColoresVisible] = useState(false);

  const tema = TEMAS[temaActual];

  const categoriasDisponibles = [
    { nombre: 'Transporte', emoji: '🚗' },
    { nombre: 'Pasaje', emoji: '🚌' },
    { nombre: 'Comida', emoji: '🍔' },
    { nombre: 'Otros', emoji: '✨' }
  ];

  useEffect(() => {
    obtenerTransacciones();
  }, []);

  const obtenerTransacciones = async () => {
    const { data } = await supabase.from('transacciones').select('*').order('created_at', { ascending: false });
    setTransacciones(data || []);
  };

  const ahorrosList = transacciones.filter(t => t.categoria && t.categoria.startsWith('🐷'));
  const transaccionesNormales = transacciones.filter(t => !t.categoria || !t.categoria.startsWith('🐷'));

  const calculoBruto = transaccionesNormales.reduce((acc, curr) => {
    const valor = curr.monto || 0;
    return curr.tipo === 'ingreso' ? acc + valor : acc - valor;
  }, 0);

  const totalAhorrado = ahorrosList.reduce((acc, curr) => acc + (curr.monto || 0), 0);
  const totalBalance = parseFloat((calculoBruto - totalAhorrado).toFixed(2)) === 0 ? 0 : parseFloat((calculoBruto - totalAhorrado).toFixed(2));

  const agregarTransaccion = async (tipo: 'gasto' | 'ingreso') => {
    if (!concepto || !monto) {
      Alert.alert('Campos incompletos', 'Por favor llena el concepto y el monto.');
      return;
    }

    let montoNum = parseFloat(monto.replace(/,/g, ''));
    if (isNaN(montoNum) || montoNum <= 0) {
      Alert.alert('Monto inválido', 'Ingresa una cantidad numérica válida.');
      return;
    }

    if (tipo === 'gasto' && montoNum > totalBalance) {
      Alert.alert('Saldo insuficiente', 'No puedes gastar más de lo que tienes en tu balance.');
      return;
    }

    let emojiFinal = '📌';
    let categoriaFinal = categoriaSeleccionada;

    if (categoriaSeleccionada === 'Otros') {
      categoriaFinal = categoriaPersonalizada.trim() || 'General';
      emojiFinal = emojiPersonalizado.trim() || '📌';
    } else {
      const encontrada = categoriasDisponibles.find(c => c.nombre === categoriaSeleccionada);
      if (encontrada) emojiFinal = encontrada.emoji;
    }

    const { error } = await supabase.from('transacciones').insert([
      { concepto: concepto.trim(), monto: montoNum, tipo: tipo, categoria: `${emojiFinal} ${categoriaFinal}` }
    ]);

    if (!error) {
      setConcepto(''); setMonto(''); setCategoriaPersonalizada('');
      setModalMasVisible(false);
      setTabActiva(0);
      obtenerTransacciones();
    } else {
      Alert.alert('Error', error.message);
    }
  };

  const depositarAlChanchito = async () => {
    if (!monto) {
      Alert.alert('Monto incompleto', 'Ingresa cuánto deseas ahorrar.');
      return;
    }

    const montoNum = parseFloat(monto.replace(/,/g, ''));
    if (isNaN(montoNum) || montoNum <= 0) {
      Alert.alert('Monto inválido', 'Ingresa una cantidad válida.');
      return;
    }

    if (montoNum > totalBalance) {
      Alert.alert('Saldo insuficiente', 'El monto que quieres meter al chanchito es mayor a tu balance disponible.');
      return;
    }

    const { data, error } = await supabase.rpc('depositar_al_chanchito', {
      p_monto: montoNum,
      p_meta: metaAhorro,
    });

    if (error) {
      Alert.alert(
        'No se pudo completar el depósito',
        `Verifica que hayas creado la tabla ahorros_main y la función SQL depositar_al_chanchito.\n\n${error.message}`
      );
      return;
    }

    setMonto('');
    setModalMasVisible(false);
    setTabActiva(2);
    await obtenerTransacciones();

    if (data?.completada) {
      Alert.alert(
        '🎉 ¡LOGRASTE TU META!',
        `Se enviaron S/ ${formatearMonto(Number(data.meta))} a ahorros_main.${Number(data.excedente) > 0 ? `\n\nEl excedente de S/ ${formatearMonto(Number(data.excedente))} volvió a tu balance general.` : ''}\n\n¡Tu chanchito está listo para comenzar de nuevo!`
      );
    }
  };

  const eliminarTransaccion = (item: any) => {
    const esIngreso = item.tipo === 'ingreso';
    Alert.alert(
      'Eliminar movimiento',
      `¿Deseas eliminar «${item.concepto}» por S/ ${formatearMonto(item.monto || 0)}? ${esIngreso ? 'Al eliminar este ingreso, tu balance disminuirá.' : 'Al eliminar este gasto, el dinero volverá a tu balance disponible.'}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('transacciones').delete().eq('id', item.id);
            if (error) {
              Alert.alert('Error', `No se pudo eliminar el movimiento: ${error.message}`);
              return;
            }
            await obtenerTransacciones();
          }
        }
      ]
    );
  };

  const eliminarDepositoAhorro = async (item: any) => {
    Alert.alert(
      'Retirar del Chanchito',
      `¿Deseas retirar S/ ${item.monto} y devolver el dinero a tu balance general?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, retirar', 
          onPress: async () => {
            await supabase.from('transacciones').delete().eq('id', item.id);
            obtenerTransacciones();
          } 
        }
      ]
    );
  };

  const disolverChanchito = () => {
    if (ahorrosList.length === 0) return;
    Alert.alert(
      'Disolver Chanchito 🐷',
      '¿Estás seguro? Todo el dinero acumulado regresará a tu balance general disponible.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, disolver', 
          onPress: async () => {
            for (let ahorro of ahorrosList) {
              await supabase.from('transacciones').delete().eq('id', ahorro.id);
            }
            obtenerTransacciones();
          } 
        }
      ]
    );
  };

  const formatearMonto = (valor: number) => {
    if (isNaN(valor)) return '0';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: valor % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 }).format(valor);
  };

  const obtenerEtiquetaFecha = (fechaIso: string) => {
    if (!fechaIso) return 'Anterior';
    const fechaTransaccion = new Date(fechaIso);
    const hoy = new Date();
    fechaTransaccion.setHours(0,0,0,0); hoy.setHours(0,0,0,0);
    const dif = Math.round((hoy.getTime() - fechaTransaccion.getTime()) / (1000 * 60 * 60 * 24));
    if (dif === 0) return 'HOY';
    if (dif === 1) return 'AYER';
    if (dif === 2) return 'ANTEAYER';
    if (fechaTransaccion.getFullYear() !== hoy.getFullYear()) return fechaTransaccion.toLocaleDateString();
    return fechaTransaccion.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase();
  };

  const transaccionesFiltradas = filtrandoPorFecha && fechaSeleccionada
    ? transaccionesNormales.filter(i => {
        const d = new Date(i.created_at);
        return d.getDate() === fechaSeleccionada.getDate() && d.getMonth() === fechaSeleccionada.getMonth() && d.getFullYear() === fechaSeleccionada.getFullYear();
      })
    : transaccionesNormales;

  const transaccionesConSeccion = transaccionesFiltradas.map(i => ({ ...i, seccionFecha: obtenerEtiquetaFecha(i.created_at) }));
  const ahorrosConSeccion = ahorrosList.map(i => ({ ...i, seccionFecha: obtenerEtiquetaFecha(i.created_at) }));
  
  const porcentajeAhorro = metaAhorro > 0 ? Math.min(Math.round((totalAhorrado / metaAhorro) * 100), 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: tema.fondoApp }]}>
      <StatusBar barStyle="light-content" backgroundColor={tema.fondoApp} />
      
      {/* SECCIÓN 1: HOME (CUENTAS) */}
      {tabActiva === 0 && (
        <View style={styles.tabContent}>
          <View style={[styles.header, { backgroundColor: tema.fondoHeader }]}>
            <Text style={styles.subTitle}>Balance actual</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmount}>{formatearMonto(totalBalance)}</Text>
              <Text style={styles.currencyText}>PEN</Text>
            </View>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.listContainer}>
              <View style={styles.listHeaderRow}>
                <Text style={styles.sectionTitle}>
                  {filtrandoPorFecha ? `Registros del ${fechaSeleccionada?.toLocaleDateString()}` : 'Historial Reciente'}
                </Text>
                
                <View style={styles.calendarButtonsRow}>
                  <TouchableOpacity style={[styles.calendarButton, { backgroundColor: tema.fondoHeader }]} onPress={() => setMostrarCalendario(true)}>
                    <Text style={styles.calendarButtonText}>📅 Buscar</Text>
                  </TouchableOpacity>
                  {filtrandoPorFecha && (
                    <TouchableOpacity style={styles.clearFilterButton} onPress={() => setFiltrandoPorFecha(false)}>
                      <Text style={styles.clearFilterText}>Ver Todo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {mostrarCalendario && (
                <DateTimePicker value={fechaSeleccionada || new Date()} mode="date" display="default" onChange={(e, d) => { setMostrarCalendario(false); if(d){ setFechaSeleccionada(d); setFiltrandoPorFecha(true);}}} />
              )}

              {transaccionesConSeccion.length === 0 ? (
                <View style={[styles.emptyContainerCard, { backgroundColor: tema.cardBg }]}>
                  <Text style={styles.emptyText}>No hubo registros ese día</Text>
                  <Image source={require('./Assets/ImgDecorative-Registros.png')} style={styles.emptyImageSmall} />
                </View>
              ) : (
                transaccionesConSeccion.map((item, index) => {
                  const esIngreso = item.tipo === 'ingreso';
                  const montoFormateado = formatearMonto(item.monto || 0);
                  const mostrarEncabezado = !filtrandoPorFecha && (index === 0 || transaccionesConSeccion[index - 1].seccionFecha !== item.seccionFecha);
                  const partesCat = item.categoria ? item.categoria.split(' ') : ['📌', 'General'];

                  return (
                    <View key={item.id?.toString() || index}>
                      {mostrarEncabezado && <Text style={[styles.dateHeaderLabel, { color: tema.primario }]}>{item.seccionFecha}</Text>}
                      <View style={[styles.transactionCard, { backgroundColor: tema.cardBg }]}>
                        <View style={styles.transactionLeft}>
                          <View style={[styles.categoryIconContainer, { backgroundColor: tema.inputBg }]}>
                            <Text style={styles.categoryEmoji}>{partesCat[0]}</Text>
                          </View>
                          <View>
                            <Text style={styles.itemConcepto}>{item.concepto}</Text>
                            <Text style={styles.itemCategoria}>{partesCat.slice(1).join(' ')}</Text>
                          </View>
                        </View>
                        <View style={styles.montoYAcciones}>
                          <Text style={[styles.itemMonto, { color: esIngreso ? '#22c55e' : '#f43f5e' }]}>
                            {esIngreso ? `+ S/ ${montoFormateado}` : `- S/ ${montoFormateado}`}
                          </Text>
                          <TouchableOpacity
                            onPress={() => eliminarTransaccion(item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Opciones para ${item.concepto}`}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.threeDots}>⋮</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* SECCIÓN 3: AHORROS */}
      {tabActiva === 2 && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <View style={styles.chanchitoMainContainer}>
            
            {/* Meta superior con su banderita */}
            <View style={styles.metaSuperiorContainer}>
              <Text style={styles.metaSuperiorTextoUnido}>🚩 META: S/ {formatearMonto(metaAhorro)}</Text>
            </View>

            {/* Círculo de progreso fluido */}
            <AnilloProgreso 
              porcentaje={porcentajeAhorro} 
              colorPrimario={tema.primario} 
              colorFondo={tema.bordeColor} 
              colorInterior={tema.cardBg}
            >
              {/* Imagen Cerdito.png extra grande ocupando el área */}
              <Image source={require('./Assets/Cerdito.png')} style={styles.cerditoImagenExtraGrande} />

              {/* Si no hay ahorros, permite cambiar la meta con un toque sutil */}
              {ahorrosList.length === 0 && (
                <TouchableOpacity onPress={() => setModalMetaVisible(true)} style={styles.cambiarMetaBtnPos}>
                  <Text style={styles.editarMetaText}>Modificar Meta</Text>
                </TouchableOpacity>
              )}
            </AnilloProgreso>

            {ahorrosList.length > 0 && (
              <TouchableOpacity style={styles.disolverBtn} onPress={disolverChanchito}>
                <Text style={styles.disolverBtnText}>💥 Disolver Chanchito (Retirar todo)</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitleHistorial}>Historial del Chanchito</Text>

            {ahorrosConSeccion.length === 0 ? (
              <Text style={styles.sinAhorrosText}>Aún no tienes ahorros registrados. ¡Usa el botón + para empezar!</Text>
            ) : (
              ahorrosConSeccion.map((item, index) => {
                const montoFormateado = formatearMonto(item.monto || 0);
                const mostrarEncabezado = index === 0 || ahorrosConSeccion[index - 1].seccionFecha !== item.seccionFecha;

                return (
                  <View key={item.id?.toString() || index} style={{ width: '100%' }}>
                    {mostrarEncabezado && <Text style={[styles.dateHeaderLabel, { color: tema.primario }]}>{item.seccionFecha}</Text>}
                    <View style={[styles.transactionCard, { backgroundColor: tema.cardBg }]}>
                      <View style={styles.transactionLeft}>
                        <View style={[styles.categoryIconContainer, { backgroundColor: tema.inputBg }]}>
                          <Text style={styles.categoryEmoji}>🪙</Text>
                        </View>
                        <View>
                          <Text style={styles.itemConcepto}>Depósito Ahorro</Text>
                          <Text style={styles.itemCategoria}>Ahorro registrado</Text>
                        </View>
                      </View>
                      <View style={styles.montoYAcciones}>
                        <Text style={[styles.itemMonto, { color: '#22c55e' }]}>+ S/ {montoFormateado}</Text>
                        <TouchableOpacity onPress={() => eliminarDepositoAhorro(item)}>
                          <Text style={styles.threeDots}>⋮</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* BARRA DE NAVEGACIÓN INFERIOR */}
      <View style={[styles.bottomNav, { backgroundColor: tema.cardBg, borderColor: tema.bordeColor }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => setTabActiva(0)} onLongPress={() => setModalColoresVisible(true)}>
          <Text style={[styles.navIcon, tabActiva === 0 && { color: tema.primario }]}>🏠</Text>
          <Text style={[styles.navText, tabActiva === 0 && { color: tema.primario }]}>Home</Text>
        </TouchableOpacity>

        {/* BOTÓN CENTRAL (+) */}
        <TouchableOpacity 
          style={[styles.navPlusButton, { backgroundColor: tema.primario }]} 
          onPress={() => setModalMasVisible(true)}
        >
          <Text style={styles.navPlusText}>＋</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setTabActiva(2)}>
          <Text style={[styles.navIcon, tabActiva === 2 && { color: tema.primario }]}>🐷</Text>
          <Text style={[styles.navText, tabActiva === 2 && { color: tema.primario }]}>Ahorros</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL GLOBO FLOTANTE INDEPENDIENTE */}
      <Modal animationType="slide" transparent={true} visible={modalMasVisible} onRequestClose={() => setModalMasVisible(false)}>
        <View style={styles.modalGloboOverlay}>
          <View style={[styles.modalGloboContent, { backgroundColor: tema.cardBg, borderColor: tema.bordeColor }]}>
            
            {/* GLOBO DE HOME */}
            {tabActiva === 0 && (
              <View>
                <Text style={styles.chanchitoFormHeader}>⚡ Registrar Movimiento</Text>
                <TextInput style={[styles.input, { backgroundColor: tema.inputBg, borderColor: tema.bordeColor }]} placeholder="Concepto (ej. Almuerzo)" placeholderTextColor="#94a3b8" value={concepto} onChangeText={setConcepto} />
                <TextInput style={[styles.input, { backgroundColor: tema.inputBg, borderColor: tema.bordeColor }]} placeholder="Monto (ej. 15.50)" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" value={monto} onChangeText={setMonto} />

                <Text style={styles.labelCategoria}>Categoría:</Text>
                <View style={styles.categoriasRow}>
                  {categoriasDisponibles.map((cat) => (
                    <TouchableOpacity key={cat.nombre} style={[styles.categoriaChip, { backgroundColor: tema.inputBg, borderColor: tema.bordeColor }, categoriaSeleccionada === cat.nombre && { backgroundColor: tema.primario, borderColor: tema.primario }]} onPress={() => setCategoriaSeleccionada(cat.nombre)}>
                      <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                      <Text style={[styles.categoriaChipText, categoriaSeleccionada === cat.nombre && styles.categoriaChipTextActivo]}>{cat.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {categoriaSeleccionada === 'Otros' && (
                  <View style={styles.otrosContainer}>
                    <TextInput style={[styles.inputEmoji, { backgroundColor: tema.inputBg, borderColor: tema.bordeColor }]} placeholder="Emoji" maxLength={2} value={emojiPersonalizado} onChangeText={setEmojiPersonalizado} />
                    <TextInput style={[styles.inputCustomCat, { backgroundColor: tema.inputBg, borderColor: tema.bordeColor }]} placeholder="Nombre categoría" placeholderTextColor="#94a3b8" value={categoriaPersonalizada} onChangeText={setCategoriaPersonalizada} />
                  </View>
                )}

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={[styles.button, styles.buttonIngreso]} onPress={() => agregarTransaccion('ingreso')}><Text style={styles.buttonTextLight}>+ Ingreso</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.buttonGasto]} onPress={() => agregarTransaccion('gasto')}><Text style={styles.buttonTextLight}>- Gasto</Text></TouchableOpacity>
                </View>
              </View>
            )}

            {/* GLOBO DE AHORROS */}
            {tabActiva === 2 && (
              <View>
                <Text style={styles.chanchitoFormHeader}>🐷 Depositar a tu Chanchito</Text>
                <TextInput style={[styles.input, { backgroundColor: tema.inputBg, borderColor: tema.bordeColor }]} placeholder="Monto a guardar (ej. 50)" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" value={monto} onChangeText={setMonto} />
                <TouchableOpacity style={[styles.buttonFull, { backgroundColor: '#22c55e' }]} onPress={depositarAlChanchito}>
                  <Text style={styles.buttonTextLight}>Guardar en Chanchito</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.cerrarGloboBtn} onPress={() => setModalMasVisible(false)}>
              <Text style={styles.cerrarGloboText}>Cancelar</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* MODAL CAMBIAR META */}
      <Modal animationType="fade" transparent={true} visible={modalMetaVisible} onRequestClose={() => setModalMetaVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentVertical, { backgroundColor: tema.cardBg }]}>
            <Text style={styles.modalTitle}>Configurar Meta de Ahorro</Text>
            <TextInput style={[styles.input, { backgroundColor: tema.inputBg, borderColor: tema.bordeColor, width: '100%' }]} placeholder="Nueva meta (ej. 500)" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" value={nuevaMetaInput} onChangeText={setNuevaMetaInput} />
            <TouchableOpacity style={[styles.cerrarModalBtn, { backgroundColor: tema.primario, width: '100%', alignItems: 'center' }]} onPress={() => { const val = parseFloat(nuevaMetaInput); if(!isNaN(val) && val > 0) setMetaAhorro(val); setModalMetaVisible(false); setNuevaMetaInput(''); }}>
              <Text style={styles.cerrarModalText}>Guardar Meta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE COLORES */}
      <Modal animationType="fade" transparent={true} visible={modalColoresVisible} onRequestClose={() => setModalColoresVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentVertical, { backgroundColor: tema.cardBg }]}>
            <Text style={styles.modalTitle}>Elige tu estilo visual</Text>
            <View style={styles.circulosColumn}>
              {['morado', 'verde', 'gris', 'amarillo'].map((t) => (
                <TouchableOpacity key={t} style={styles.circuloRowItem} onPress={() => { setTemaActual(t as any); setModalColoresVisible(false); }}>
                  <View style={styles.circuloDoble}>
                    <View style={[styles.mitadCirculo, { backgroundColor: TEMAS[t as keyof typeof TEMAS].fondoHeader }]} />
                    <View style={[styles.mitadCirculo, { backgroundColor: '#ffffff' }]} />
                  </View>
                  <Text style={styles.circuloLabel}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.cerrarModalBtn, { backgroundColor: tema.primario }]} onPress={() => setModalColoresVisible(false)}>
              <Text style={styles.cerrarModalText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 45 },
  tabContent: { flex: 1, paddingBottom: 80 },
  header: { borderRadius: 20, padding: 22, alignItems: 'flex-start', elevation: 6 },
  subTitle: { fontSize: 13, color: '#e2e8f0', fontWeight: '500', textTransform: 'uppercase' },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  balanceAmount: { fontSize: 36, fontWeight: 'bold', color: '#ffffff' },
  currencyText: { fontSize: 14, fontWeight: 'bold', color: '#e2e8f0', marginLeft: 6 },
  scrollContent: { flex: 1, marginTop: 15 },
  chanchitoFormHeader: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 15, textAlign: 'center' },
  input: { color: '#f8fafc', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, marginBottom: 12, borderWidth: 1 },
  buttonFull: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 5 },
  otrosContainer: { flexDirection: 'row', marginBottom: 12 },
  inputEmoji: { width: 60, textAlign: 'center', color: '#f8fafc', borderRadius: 12, paddingVertical: 12, fontSize: 16, borderWidth: 1, marginRight: 8 },
  inputCustomCat: { flex: 1, color: '#f8fafc', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, borderWidth: 1 },
  labelCategoria: { color: '#cbd5e1', fontSize: 13, marginBottom: 8, fontWeight: '600' },
  categoriasRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  categoriaChip: { flex: 1, paddingVertical: 10, marginHorizontal: 2, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  chipEmoji: { fontSize: 16, marginBottom: 2 },
  categoriaChipText: { color: '#94a3b8', fontSize: 10, fontWeight: '600' },
  categoriaChipTextActivo: { color: '#ffffff', fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  button: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginHorizontal: 4 },
  buttonIngreso: { backgroundColor: '#22c55e' },
  buttonGasto: { backgroundColor: '#f43f5e' },
  buttonTextLight: { color: '#f8fafc', fontWeight: 'bold', fontSize: 15 },
  listContainer: { marginTop: 10, paddingBottom: 20 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', flex: 1 },
  calendarButtonsRow: { flexDirection: 'row', alignItems: 'center' },
  calendarButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 5 },
  calendarButtonText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  clearFilterButton: { backgroundColor: '#f43f5e', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, marginLeft: 5 },
  clearFilterText: { color: '#f8fafc', fontSize: 11, fontWeight: 'bold' },
  dateHeaderLabel: { fontSize: 13, fontWeight: 'bold', marginTop: 10, marginBottom: 6, letterSpacing: 1 },
  transactionCard: { borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  categoryEmoji: { fontSize: 20 },
  itemConcepto: { fontSize: 15, fontWeight: '600', color: '#f8fafc' },
  itemCategoria: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  itemMonto: { fontSize: 15, fontWeight: 'bold' },
  montoYAcciones: { flexDirection: 'row', alignItems: 'center' },
  threeDots: { color: '#94a3b8', fontSize: 22, fontWeight: 'bold', marginLeft: 10, paddingHorizontal: 5 },
  emptyContainerCard: { borderRadius: 12, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  emptyText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  emptyImageSmall: { width: 45, height: 45, resizeMode: 'contain' },
  chanchitoMainContainer: { alignItems: 'center', paddingVertical: 10 },
  metaSuperiorContainer: { alignItems: 'center', marginBottom: 8 },
  metaSuperiorTextoUnido: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', letterSpacing: 1 },
  cerditoImagenExtraGrande: { width: 200, height: 200, resizeMode: 'contain' },
  cambiarMetaBtnPos: { position: 'relative', bottom: 25, alignSelf: 'center' },
  editarMetaText: { fontSize: 11, color: '#38bdf8', textDecorationLine: 'underline', textAlign: 'center' },
  disolverBtn: { backgroundColor: '#f43f5e', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, marginBottom: 20 },
  disolverBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  sectionTitleHistorial: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', alignSelf: 'flex-start', marginBottom: 10 },
  sinAhorrosText: { color: '#94a3b8', textAlign: 'center', marginTop: 20 },
  bottomNav: { position: 'absolute', bottom: 20, left: 20, right: 20, height: 65, borderRadius: 20, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', elevation: 8 },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navIcon: { fontSize: 20, opacity: 0.6 },
  navText: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
  navPlusButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 5, elevation: 5 },
  navPlusText: { fontSize: 28, color: '#ffffff', fontWeight: 'bold', marginTop: -2 },
  modalGloboOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalGloboContent: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, borderWidth: 1, borderBottomWidth: 0 },
  cerrarGloboBtn: { marginTop: 15, paddingVertical: 10, alignItems: 'center' },
  cerrarGloboText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContentVertical: { width: '75%', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 15, textAlign: 'center' },
  circulosColumn: { width: '100%', marginBottom: 15 },
  circuloRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, marginBottom: 5 },
  circuloDoble: { width: 36, height: 36, borderRadius: 18, flexDirection: 'row', overflow: 'hidden', borderWidth: 2, borderColor: '#ffffff', marginRight: 12 },
  mitadCirculo: { width: '50%', height: '100%' },
  circuloLabel: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  cerrarModalBtn: { paddingVertical: 10, paddingHorizontal: 25, borderRadius: 8, marginTop: 5 },
  cerrarModalText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 }
});