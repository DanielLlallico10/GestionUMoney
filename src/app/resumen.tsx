import DateTimePicker from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import Svg, { Text as SvgText } from 'react-native-svg';

interface Transaccion {
  id: string | number;
  concepto: string;
  monto: number | string;
  tipo: string;
  categoria?: string | null;
  fecha?: string | null;
  created_at?: string | null;
}

interface TemaResumen {
  fondoApp: string;
  cardBg: string;
  bordeColor: string;
  primario: string;
}

interface PropsResumen {
  transacciones: Transaccion[];
  tema: TemaResumen;
}

const COLORES_CATEGORIAS = [
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#ef4444',
  '#22c55e',
  '#ec4899',
  '#3b82f6',
  '#f97316',
];

const obtenerClaveFecha = (fecha: Date) => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const obtenerClaveFechaTransaccion = (fecha: string) => {
  const fechaLocal = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fechaLocal) return `${fechaLocal[3]}-${fechaLocal[2]}-${fechaLocal[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;

  const valorFecha = new Date(fecha);
  if (Number.isNaN(valorFecha.getTime())) return null;
  return obtenerClaveFecha(valorFecha);
};

const obtenerNombreCategoria = (transaccion: Transaccion) => {
  const categoria = transaccion.categoria?.trim();
  if (!categoria) return 'Otros';

  if (/^\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?$/u.test(categoria)) {
    return `${categoria} ${transaccion.concepto.trim() || 'Sin categoría'}`;
  }

  return categoria;
};

export default function ResumenStats({ transacciones, tema }: PropsResumen) {
  const { width: anchoPantalla } = useWindowDimensions();
  const hoyDate = new Date();
  const haceUnMesDate = new Date();
  haceUnMesDate.setDate(hoyDate.getDate() - 30);

  const [fechaInicio, setFechaInicio] = useState(haceUnMesDate);
  const [fechaFin, setFechaFin] = useState(hoyDate);

  // Estados para el calendario
  const [showPicker, setShowPicker] = useState(false);
  const [tipoPicker, setTipoPicker] = useState<'inicio' | 'fin'>('inicio');

  // Filtra transacciones asegurando que el formato de fecha sea correcto
  const transaccionesFiltradas = useMemo(() => {
    const inicioStr = obtenerClaveFecha(fechaInicio);
    const finStr = obtenerClaveFecha(fechaFin);

    return transacciones.filter((t) => {
      const fechaCruda = t.fecha ?? t.created_at;
      if (!fechaCruda) return false;

      const fechaLimpia = obtenerClaveFechaTransaccion(fechaCruda);
      return fechaLimpia !== null && fechaLimpia >= inicioStr && fechaLimpia <= finStr;
    });
  }, [transacciones, fechaInicio, fechaFin]);

  const { totalIngresos, totalGastos, categoriasDesglose } = useMemo(() => {
    let ing = 0;
    let gas = 0;
    const catMap: Record<string, number> = {};

    transaccionesFiltradas.forEach((t) => {
      const montoNum = Number(t.monto) || 0;
      const tipoLimpio = t.tipo.toLowerCase().trim();

      if (tipoLimpio === 'ingreso') {
        ing += montoNum;
      } else if (tipoLimpio === 'gasto') {
        gas += montoNum;
        const catNombre = obtenerNombreCategoria(t);
        catMap[catNombre] = (catMap[catNombre] || 0) + montoNum;
      }
    });

    const desgloseArray = Object.keys(catMap).map((cat) => ({
      categoria: cat,
      monto: catMap[cat],
      porcentaje: gas > 0 ? ((catMap[cat] / gas) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.monto - a.monto);

    return { totalIngresos: ing, totalGastos: gas, categoriasDesglose: desgloseArray };
  }, [transaccionesFiltradas]);

  const datosGrafico = useMemo(
    () =>
      categoriasDesglose.map((categoria, index) => ({
        name: categoria.categoria,
        population: categoria.monto,
        color: COLORES_CATEGORIAS[index % COLORES_CATEGORIAS.length],
        legendFontColor: '#cbd5e1',
        legendFontSize: 12,
      })),
    [categoriasDesglose],
  );
  const anchoGrafico = Math.min(anchoPantalla - 64, 420);
  const altoGrafico = 220;
  const etiquetasPorcentaje = useMemo(() => {
    const radioEtiqueta = (altoGrafico / 2.5) * 0.62;

    return categoriasDesglose.map((categoria, index) => {
      const proporcion = totalGastos > 0 ? categoria.monto / totalGastos : 0;
      const anguloInicio = categoriasDesglose
        .slice(0, index)
        .reduce((angulo, anterior) => angulo + (anterior.monto / totalGastos) * 2 * Math.PI, 0);
      const anguloMedio = anguloInicio + (proporcion * Math.PI);

      return {
        texto: `${Math.round(proporcion * 100)}%`,
        x: anchoGrafico / 2 + Math.sin(anguloMedio) * radioEtiqueta,
        y: altoGrafico / 2 - Math.cos(anguloMedio) * radioEtiqueta,
      };
    });
  }, [categoriasDesglose, anchoGrafico, totalGastos]);

  // Manejador del calendario
  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (!selectedDate) return;

    if (selectedDate > hoyDate) {
      Alert.alert("Fecha inválida", "No puedes seleccionar una fecha futura.");
      return;
    }

    if (tipoPicker === 'inicio') {
      if (selectedDate > fechaFin) {
        Alert.alert("Error", "La fecha de inicio no puede ser mayor a la fecha de fin.");
      } else {
        setFechaInicio(selectedDate);
      }
    } else {
      if (selectedDate < fechaInicio) {
        Alert.alert("Error", "La fecha de fin no puede ser menor a la fecha de inicio.");
      } else {
        setFechaFin(selectedDate);
      }
    }
  };

  const abrirPicker = (tipo: 'inicio' | 'fin') => {
    setTipoPicker(tipo);
    setShowPicker(true);
  };

  const formatearFecha = (fecha: Date) => obtenerClaveFecha(fecha);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tema.fondoApp }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.titulo, { color: '#ffffff' }]}>📊 Resumen Financiero</Text>

      {/* FILTRO DE FECHAS */}
      <View style={[styles.cardFechas, { backgroundColor: tema.cardBg, borderColor: tema.bordeColor }]}>
        <View style={styles.filaFechas}>
          <TouchableOpacity style={styles.botonFecha} onPress={() => abrirPicker('inicio')}>
            <Text style={[styles.labelSub, { color: '#ffffff' }]}>Desde</Text>
            <Text style={[styles.textoFecha, { color: tema.primario }]}>{formatearFecha(fechaInicio)}</Text>
          </TouchableOpacity>

          <Text style={{ color: '#ffffff', fontSize: 20 }}>-</Text>

          <TouchableOpacity style={styles.botonFecha} onPress={() => abrirPicker('fin')}>
            <Text style={[styles.labelSub, { color: '#ffffff' }]}>Hasta</Text>
            <Text style={[styles.textoFecha, { color: tema.primario }]}>{formatearFecha(fechaFin)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showPicker && (
        <DateTimePicker
          value={tipoPicker === 'inicio' ? fechaInicio : fechaFin}
          mode="date"
          display="default"
          onChange={onChangeDate}
          maximumDate={hoyDate}
        />
      )}

      {/* TARJETA DE BALANCE */}
      <View style={[styles.card, { backgroundColor: tema.cardBg, borderColor: tema.bordeColor }]}>
        <View style={styles.rowBalance}>
          <View>
            <Text style={[styles.labelSub, { color: '#ffffff' }]}>Total Ingresos</Text>
            <Text style={[styles.montoBalance, { color: '#22c55e' }]}>+S/ {totalIngresos.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={[styles.labelSub, { color: '#ffffff' }]}>Total Gastos</Text>
            <Text style={[styles.montoBalance, { color: '#ef4444' }]}>-S/ {totalGastos.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* ESTADO VACÍO O BARRAS DE CATEGORÍAS */}
      {transaccionesFiltradas.length === 0 || (totalIngresos === 0 && totalGastos === 0) ? (
        <View style={[styles.cardVacio, { backgroundColor: tema.cardBg, borderColor: tema.bordeColor }]}>
          <Text style={styles.emojiTriste}>🕸️</Text>
          <Text style={[styles.textoVacioTitulo, { color: '#ffffff' }]}>No hay nada que mostrar</Text>
          <Text style={styles.textoVacioSub}>
            No se encontraron movimientos en este rango de fechas.
          </Text>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: tema.cardBg, borderColor: tema.bordeColor }]}>
          <Text style={[styles.subtitulo, { color: '#ffffff' }]}>Gastos por Categoría</Text>
          {datosGrafico.length === 0 ? (
            <Text style={styles.textoVacioSub}>No hay gastos en este rango de fechas.</Text>
          ) : (
            <>
              <View style={styles.graficoContainer}>
                <PieChart
                  data={datosGrafico}
                  width={anchoGrafico}
                  height={altoGrafico}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  center={[anchoGrafico / 4, 0]}
                  hasLegend={false}
                  chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
                />
                <Svg width={anchoGrafico} height={altoGrafico} style={styles.etiquetasGrafico}>
                  {etiquetasPorcentaje.map((etiqueta, index) => (
                    <SvgText
                      key={`${categoriasDesglose[index].categoria}-porcentaje`}
                      x={etiqueta.x}
                      y={etiqueta.y}
                      fill="#ffffff"
                      fontSize={10}
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {etiqueta.texto}
                    </SvgText>
                  ))}
                </Svg>
              </View>
              {categoriasDesglose.map((cat, index) => (
                <View key={cat.categoria} style={styles.catItem}>
                  <View style={styles.catHeader}>
                    <View style={styles.catLabel}>
                      <View style={[styles.leyendaColor, { backgroundColor: COLORES_CATEGORIAS[index % COLORES_CATEGORIAS.length] }]} />
                      <Text style={[styles.catNombre, { color: '#ffffff' }]}>{cat.categoria}</Text>
                    </View>
                    <Text style={[styles.catMonto, { color: '#ffffff' }]}>S/ {cat.monto.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, marginTop: 10 },
  subtitulo: { fontSize: 16, fontWeight: 'bold', marginBottom: 14 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  rowBalance: { flexDirection: 'row', justifyContent: 'space-between' },
  labelSub: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  montoBalance: { fontSize: 18, fontWeight: 'bold' },

  // Estilos del Filtro de Fechas
  cardFechas: { padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  filaFechas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
  botonFecha: { alignItems: 'center' },
  textoFecha: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },

  // Estado vacío
  cardVacio: { padding: 30, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginTop: 10 },
  emojiTriste: { fontSize: 45, marginBottom: 10 },
  textoVacioTitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  textoVacioSub: { color: '#94a3b8', fontSize: 13, textAlign: 'center' },
  graficoContainer: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  etiquetasGrafico: { position: 'absolute', top: 0, left: 0 },

  // Barras
  catItem: { marginBottom: 12 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catLabel: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 8 },
  leyendaColor: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  catNombre: { fontSize: 14, fontWeight: '500' },
  catMonto: { fontSize: 13, color: '#94a3b8' },
});