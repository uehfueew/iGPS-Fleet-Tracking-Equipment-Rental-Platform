const fs = require('fs');

const loginPath = '/Users/drenbuqa/igps-platform/frontend/src/pages/Login.tsx';
let loginData = fs.readFileSync(loginPath, 'utf8');
// Add api import
if (!loginData.includes("import api from '../services/api';")) {
    loginData = loginData.replace("import { useNavigate, Link } from 'react-router-dom';", "import { useNavigate, Link } from 'react-router-dom';\nimport api from '../services/api';");
}
loginData = loginData.replace(/const res = await fetch\('\/api\/auth\/login', \{\n\s*method: 'POST',\n\s*headers: \{ 'Content-Type': 'application\/json' \},\n\s*body: JSON.stringify\(\{ username, password \}\),\n\s*\}\);\n\s*const data = await res.json\(\);\n\s*if \(\!res.ok\) \{\n\s*throw new Error\(data.error \|\| 'Login failed'\);\n\s*\}/g, "const res = await api.post('/auth/login', { username, password });\n      const data = res.data;");
fs.writeFileSync(loginPath, loginData);

const regPath = '/Users/drenbuqa/igps-platform/frontend/src/pages/Register.tsx';
let regData = fs.readFileSync(regPath, 'utf8');
if (!regData.includes("import api from '../services/api';")) {
    regData = regData.replace("import { useNavigate, Link } from 'react-router-dom';", "import { useNavigate, Link } from 'react-router-dom';\nimport api from '../services/api';");
}
regData = regData.replace(/const res = await fetch\('\/api\/auth\/register', \{\n\s*method: 'POST',\n\s*headers: \{ 'Content-Type': 'application\/json' \},\n\s*body: JSON.stringify\(\{ username, password, role \}\),\n\s*\}\);\n\s*const data = await res.json\(\);\n\s*if \(\!res.ok\) \{\n\s*throw new Error\(data.error \|\| 'Registration failed'\);\n\s*\}/g, "const res = await api.post('/auth/register', { username, password, role });\n      const data = res.data;");
fs.writeFileSync(regPath, regData);
console.log('Fixed auth requests');
