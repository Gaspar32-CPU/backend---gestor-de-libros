const cron = require('node-cron');
const { notificarPrestamoPorVencer } = require('../../services/notificaciones');

cron.schedule('30 5 * * *', notificarPrestamoPorVencer);
