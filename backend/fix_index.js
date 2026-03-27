const fs = require('fs');
const content = `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Parser } from 'json2csv';
import { pgPool, tsPool, prisma } from './db';
import authRouter from './routes/auth';
import equipmentRouter from './routes/equipment';
import rentalsRouter from './routes/rentals';
import geofencesRouter from './routes/geofences';
import alertsRouter from './routes/alerts';
import billingRouter from './routes/billing';
import { authenticateToken, requireRole } from './middleware/auth';
import { isPointInPolygon } from './utils/geo';
import { z } from 'zod';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  consoconst fs = require('fs');
const contd)const content = `importt'import cors from 'cors';
import dotenv from 'dot.import dotenv from 'dotefimport helmet from 'helmet'peimport rateLimit from 'exprinimport { createServer } from 'http';
imporonimport { Server } from 'socket.io';seimport { Parser } from 'json2csv';ocimport { pgPool, tsPool, prisma }teimport authRouter from './routes/auth';
impor mimport equipmentRouter from './routes/leimport rentalsRouter from './routes/rentals';
imusimport geofencesRouter from './routes/geofen);import alertsRouter from './routes/alerts';
impo.uimport billingRouter from './routes/billin('import { authenticateToken, requireRole } fr/aimport { isPointInPolygon } from './utils/geo';
import { z } from 

import { z } from 'zod';

dotenv.config();

coes
dotenv.config();

constus
const app = ex
//const httpServer = cronconst io = new Server(httpServer, {
re  cors: { origin: '*', methods: ['nt});

io.on('connection', (socket) => {
  consocorC
int:  consoconst fs = require('fs');{
const contd)const content = `ir:import dotenv from 'dot.import dotenv from 'dotefimport helmenaimporonimport { Server } from 'socket.io';seimport { Parser } from 'json2csv';ocimport { pgPool, tsPool, prisma }teimport authRouter from '.', aimpor mimport equipmentRouter from './routes/leimport rentalsRouter from './routes/rentals';
imusimport geofencesRouter from './routes/geofen);import aleprimusimport geofencesRouter from './routes/geofen);import alertsRouter from './routes/alertserimpo.uimport billingRouter from './routes/billin('import { authenticateToken, requireRole } r.import { z } from 

import { z } from 'zod';

dotenv.config();

coes
dotenv.config();

constus
const app = ex
//const httpServer = cronconst iyn
import { z } fro
  
dotenv.config();

coess =
coes
dotenv.coehidot.f
constus
const resconst ve//const httpScare  cors: { origin: '*', methods: ['nt});

io.on('connectioag
io.on('connection', (socket) => {
  con a   consocorC
int:  consoconst fs ',int:  consq,const contd)const content = `ir:imptuimusimport geofencesRouter from './routes/geofen);import aleprimusimport geofencesRouter from './routes/geofen);import alertsRouter from './routes/alertserimpo.uimport billingRouter from './routes/billin('import { authenticateToken, requireRole } r.import { z } from 

import { z } from 'zod';

dotenv.config();

coes
dotenv.configim
import { z } from 'zod';

dotenv.config();

coes
dotenv.config();

constus
const app = ex
//const httpServer = cronconst iyn
import { z } fro
  
dotenv.config();

coess =
coes
dotenv.coehidot.f
constus
const resconst ve//const httpScare  cors: { origin: '*', methodtio
dotenv.config();

coesp: 
coes
dotenv.coampdot  
constus
const ck const ce//const httpSeoimport { z } fro
  
dotenv.confignd  
dotenv.confi (don
coess =
ceofencescoes
d  dotonconstus
const repoconst 
 
io.on('connectioag
io.on('connection', (socket) => {
  con a   consocor   io.on('connectionas  con a   consocorC
int:  consocdFint:  consoconst fre
import { z } from 'zod';

dotenv.config();

coes
dotenv.configim
import { z } from 'zod';

dotenv.config();

coes
dotenv.config();

constus
const app = ex
//const httpServer = cronconst iyn
import { z } fro
  
dotenv.config();

coess =
coes
dotenv.coehidot.f
constus
const resconst ve//const httpScare  cors: { origin: '*', methodtio
dotess
dotenv.config();

coesgeo
coes
dotenv.come}dot}
import { z } f  
dotenv.config();

coeside
coes
dotenv.co{
 dot  
constuit prisma.aconst re//const httpS  import { z } fro
  
dotenv.configen  
dotenv.configed coess =
coes
d gecoes
d: dotgfconstus
const re  const;
 dotenv.config();

coesp: 
coes
dotenv.coampdot  
constus
const ckny
coesp: 
coes
dtuscoes
djsdot{ constus
const ckgeconst  }  
dotenv.confignd  
dotenv.confi (don
coess =
thdntdotenv.confi (doc coess =
ceofence  ceofen{ d  dotonconsarconst repocons f 
io.on('connec.queio.on('connectionle  con a   consocor   io.on('connioint:  consocdFint:  consoconst fre
import { z } from 'zod'ntimport { z } from 'zod';

dotenv. p
dotenv.config();

coesm))
coes
dotenv.co= \dotNDimport { z } f$
dotenv.config();

coes  }
coes
dotenv.co   dotpa
constus
const ate(to));
 //conquery += \import { z } fro
  
dotenv.configng  
dotenv.confi  d  
coess =
coes
dDERcoes
dmedotmpconstus
con const result =dotess
dotenv.config();

coesgeo
coes
dotenv.come}dot}
import { z} doten (
coesgeo
coes
d recoes
dusdot0)import { z } f erdotenv.config() }
coeside
coes
d/apcoes
dcldot:i dot  
consconstrt  
dotenv.configen  
dotenv.configed coess =
coes
d gd d =dotenv.configed oncoess =
coes
d g= coes
derd g
 d: dotg  const re  cons'S dotenv.config(Po
coesp: 
coes
dovecoes
