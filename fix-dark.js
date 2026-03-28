const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AdminGroups.tsx', 'utf8');

// The original file is available in the decoded.ts, wait.. I'll just decode again.
code = fs.readFileSync('decoded.ts', 'utf8');

// Replace all words starting with "dark:"
code = code.replace(/\bdark:[a-zA-Z0-9\-:]+/g, '');

// Clean up extra spaces inside className strings
code = code.replace(/className=(["'`])(.*?)\1/g, (match, quote, classNames) => {
    return `className=${quote}${classNames.replace(/\s+/g, ' ').trim()}${quote}`;
});

code = code.replace(/\{`([\s\S]*?)`\}/g, (match, cls) => {
    return `{ \`${cls.replace(/  +/g, ' ').trim()}\` }`;
});

// Write to file
fs.writeFileSync('frontend/src/pages/AdminGroups.tsx', code);
