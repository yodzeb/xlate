const transforms = [
    {
        id: 'text',
        name: 'Plain Text',
        isReference: true,
        encode: (text) => text,
        decode: (text) => text
    },
    {
        id: 'urlEncode',
        name: 'URL Encode',
        encode: (text) => encodeURIComponent(text),
        decode: (text) => {
            try {
                return decodeURIComponent(text);
            } catch (e) {
                return 'Invalid URL encoded text';
            }
        }
    },
    {
        id: 'base64',
        name: 'Base64',
        encode: (text) => {
            try {
                // Encode UTF-8 text to Base64
                const bytes = new TextEncoder().encode(text);
                const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
                return btoa(binString);
            } catch (e) {
                return 'Error encoding';
            }
        },
        decode: (text) => {
            try {
                // Remove whitespace and newlines that might be present
                const cleaned = text.replace(/\s/g, '');
                // Decode Base64 to UTF-8 text
                const binString = atob(cleaned);
                const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
                return new TextDecoder().decode(bytes);
            } catch (e) {
                return 'Invalid Base64';
            }
        }
    },
    {
        id: 'hex',
        name: 'Hexadecimal',
        encode: (text) => {
            return Array.from(new TextEncoder().encode(text))
                .map(b => b.toString(16).padStart(2, '0'))
                .join(' ');
        },
        decode: (text) => {
            try {
                const bytes = text.replace(/\s+/g, ' ').trim().split(' ')
                      .map(h => parseInt(h, 16));
                return new TextDecoder().decode(new Uint8Array(bytes));
            } catch (e) {
                return 'Invalid hex';
            }
        }
    },
    {
        id: 'decimal',
        name: 'Decimal (Bytes)',
        encode: (text) => {
            return Array.from(new TextEncoder().encode(text))
                .map(b => b.toString(10))
                .join(' ');
        },
        decode: (text) => {
            try {
                const bytes = text.replace(/\s+/g, ' ').trim().split(' ')
                      .map(d => parseInt(d, 10));
                return new TextDecoder().decode(new Uint8Array(bytes));
            } catch (e) {
                return 'Invalid decimal';
            }
        }
    },
    {
        id: 'binary',
        name: 'Binary',
        encode: (text) => {
            return Array.from(new TextEncoder().encode(text))
                .map(b => b.toString(2).padStart(8, '0'))
                .join(' ');
        },
        decode: (text) => {
            try {
                const bytes = text.replace(/\s+/g, ' ').trim().split(' ')
                      .map(b => parseInt(b, 2));
                return new TextDecoder().decode(new Uint8Array(bytes));
            } catch (e) {
                return 'Invalid binary';
            }
        }
    },
    {
        id: 'htmlEntities',
        name: 'HTML Entities',
        encode: (text) => {
            return text.replace(/[&<>"']/g, (char) => {
                const entities = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                };
                return entities[char];
            });
        },
        decode: (text) => {
            const textarea = document.createElement('textarea');
            textarea.innerHTML = text;
            return textarea.value;
        }
    },
    {
        id: 'rot13',
        name: 'ROT13',
        encode: (text) => {
            return text.replace(/[a-zA-Z]/g, (char) => {
                const start = char <= 'Z' ? 65 : 97;
                return String.fromCharCode(start + (char.charCodeAt(0) - start + 13) % 26);
            });
        },
        decode: (text) => {
            return text.replace(/[a-zA-Z]/g, (char) => {
                const start = char <= 'Z' ? 65 : 97;
                return String.fromCharCode(start + (char.charCodeAt(0) - start + 13) % 26);
            });
        }
    },
    {
        id: 'hashes',
        name: 'Hashes',
        convert_from: false,
        encode: (text) => {
            var hashes = {
                'MD5': new Hashes.MD5().hex(text),
                'SHA1': new Hashes.SHA1().hex(text),
                'SHA256': new Hashes.SHA256().hex(text),
                'SHA512': new Hashes.SHA512().hex(text),
                'RMD160': new Hashes.RMD160().hex(text)
            };
            return Object.keys(hashes)
                .map(function(v) { return v+": "+hashes[v]; })
                .join("\n");
        }
    }
];

const grid = document.getElementById('transformGrid');
const textareas = {};

function createCard(transform) {
    const card = document.createElement('div');
    card.className = 'transform-card';
    
    const header = document.createElement('div');
    header.className = 'card-header';
    
    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = transform.name;
    header.appendChild(title);
    
    if (transform.isReference) {
        const badge = document.createElement('span');
        badge.className = 'reference-badge';
        badge.textContent = 'REFERENCE';
        header.appendChild(badge);
    }
    
    card.appendChild(header);
    
    const textarea = document.createElement('textarea');
    textarea.id = `textarea-${transform.id}`;
    textarea.placeholder = `Enter ${transform.name.toLowerCase()} here...`;
    if (transform.hasOwnProperty('convert_from') && !transform.convert_from) {
        textarea.readOnly = true;
    }
    textareas[transform.id] = textarea;
    card.appendChild(textarea);
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';

    if (!transform.hasOwnProperty('convert_from') || transform.convert_from) {
        const translateBtn = document.createElement('button');
        translateBtn.textContent = 'Translate All';
        translateBtn.onclick = () => translateFromThis(transform.id);
        buttonGroup.appendChild(translateBtn);
    }
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => copyToClipboard(transform.id);
    buttonGroup.appendChild(copyBtn);
    
    card.appendChild(buttonGroup);
    
    const status = document.createElement('div');
    status.className = 'status';
    status.id = `status-${transform.id}`;
    card.appendChild(status);
    
    return card;
}

function translateFromThis(sourceId) {
    const sourceTransform = transforms.find(t => t.id === sourceId);
    const sourceText = textareas[sourceId].value;
    
    if (!sourceText.trim()) {
        showStatus(sourceId, 'Please enter some text first', true);
        return;
    }
    
    let plainText;
    if (sourceId === 'text') {
        plainText = sourceText;
    } else {
        plainText = sourceTransform.decode(sourceText);
    }
    
    transforms.forEach(transform => {
        if (transform.id === sourceId) return;
        
        try {
            const encoded = transform.encode(plainText);
            textareas[transform.id].value = encoded;
        } catch (e) {
            textareas[transform.id].value = 'Error encoding';
        }
    });
    
    showStatus(sourceId, 'Translated to all formats');
}

function copyToClipboard(id) {
    const textarea = textareas[id];
    textarea.select();
    document.execCommand('copy');
    showStatus(id, 'Copied to clipboard');
}

function showStatus(id, message, isError = false) {
    const status = document.getElementById(`status-${id}`);
    status.textContent = message;
    status.className = isError ? 'status error' : 'status';
    setTimeout(() => {
        status.textContent = '';
    }, 3000);
}

transforms.forEach(transform => {
    grid.appendChild(createCard(transform));
});

textareas['text'].value = 'Hello, World!';
translateFromThis('text');

