const fs = require('fs');

const fixError = (filePath) => {
    let data = fs.readFileSync(filePath, 'utf8');
    data = data.replace(/catch \(err: any\) \{\n\s*setError\(err\.message\);\n\s*\}/g, "catch (err: any) {\n      setError(err.response?.data?.error || err.message);\n    }");
    fs.writeFileSync(filePath, data);
};
fixError('/Users/drenbuqa/igps-platform/frontend/src/pages/Login.tsx');
fixError('/Users/drenbuqa/igps-platform/frontend/src/pages/Register.tsx');
console.log('Fixed axios error parsing');
