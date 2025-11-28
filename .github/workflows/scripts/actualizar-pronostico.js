const axios = require('axios');

// Configuración de Firebase
const admin = require('firebase-admin');

console.log('🌦️ Iniciando actualización de pronóstico...');
console.log('Hora:', new Date().toISOString());

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token"
};

// Inicializar Firebase
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://electrion-e54b2.firebaseio.com"
  });
  console.log('✅ Firebase inicializado correctamente');
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error.message);
  process.exit(1);
}

async function actualizarPronostico() {
  try {
    console.log('🔍 Consultando API de Open-Meteo...');
    
    const response = await axios.get(
      'https://api.open-meteo.com/v1/forecast?latitude=-33.306207&longitude=-66.334639&hourly=precipitation_probability&forecast_hours=2&timezone=auto',
      { timeout: 10000 }
    );
    
    const probabilidades = response.data.hourly.precipitation_probability;
    const maxProbabilidad = Math.max(...probabilidades);
    
    console.log(`📊 Probabilidades recibidas: [${probabilidades.join(', ')}]`);
    console.log(`📈 Probabilidad máxima: ${maxProbabilidad}%`);
    
    // Actualizar Firebase
    const updateData = {
      probabilidad_lluvia: maxProbabilidad,
      ultima_actualizacion: Date.now(),
      horas_pronostico: 2,
      fuente: 'open-meteo',
      ubicacion: '-33.306207,-66.334639',
      ultima_ejecucion: new Date().toISOString()
    };
    
    await admin.database().ref('/pronostico').update(updateData);
    
    console.log('✅ Pronóstico actualizado en Firebase correctamente');
    console.log('📝 Datos enviados:', JSON.stringify(updateData, null, 2));
    
    return { 
      success: true, 
      probabilidad: maxProbabilidad,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error en actualizarPronostico:', error.message);
    
    if (error.response) {
      console.error('📡 Error de API:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('🌐 Error de conexión:', error.message);
    }
    
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  actualizarPronostico()
    .then(result => {
      if (result.success) {
        console.log('🎉 Proceso completado exitosamente');
        process.exit(0);
      } else {
        console.log('💥 Proceso completado con errores');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💀 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = actualizarPronostico;
