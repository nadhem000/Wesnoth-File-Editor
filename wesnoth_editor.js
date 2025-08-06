let pendingTagName = null;
let pendingTagDefinition = null;
// track editor focus state
let editorCursorPosition = null;
let isEditorFocused = false;
let lastCursorPosition = 0;
function updateLineNumbers() {
    const editor = document.getElementById('editor-text-student-display');
    const lineNumbers = document.getElementById('editor-text-line-numbers');
    
    // Get line count
    const text = editor.textContent || '';
    const lines = text.split('\n');
    const lineCount = lines.length;
    
    // Generate line numbers HTML
    let numbersHTML = '';
    for (let i = 1; i <= lineCount; i++) {
        numbersHTML += `<div>${i}</div>`;
	}
    
    lineNumbers.innerHTML = numbersHTML;
    lineNumbers.scrollTop = editor.scrollTop;
}
document.getElementById('editor-text-student-display').addEventListener('input', updateLineNumbers);
document.getElementById('editor-text-student-display').addEventListener('scroll', () => {
    document.getElementById('editor-text-line-numbers').scrollTop = 
	document.getElementById('editor-text-student-display').scrollTop;
});
// Update line numbers when clearing editor
document.querySelector('.editor-text-option[data-action="clear"]').addEventListener('click', function() {
    document.getElementById('editor-text-student-display').textContent = '';
    updateLineNumbers();
});
// Tab switching functionality
document.querySelectorAll('.editor-text-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        document.querySelectorAll('.editor-text-tab').forEach(t => {
            t.classList.remove('editor-text-active');
		});
		
        // Add active class to clicked tab
        tab.classList.add('editor-text-active');
		
        // Hide all tab contents
        document.querySelectorAll('.editor-text-tab-content').forEach(content => {
            content.classList.remove('editor-text-active');
		});
		
        // Show the corresponding tab content
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('editor-text-active');
		
        // Update tag list if switching to Student tab
        if (tabId === 'student') {
            updateStudentTagList();
		}
        if (tabId === 'student') {
            updateStudentTagList();
            updateLineNumbers(); // Add this line
		}
	});
});

// Expand/Collapse functionality
document.querySelectorAll('.editor-text-howto, .editor-text-dictionary').forEach(section => {
    const header = section.querySelector('.editor-text-howto-header, .editor-text-dictionary-header');
    const content = section.querySelector('.editor-text-howto-content, .editor-text-dictionary-content');
    const icon = header.querySelector('.editor-text-icon');
	
    header.addEventListener('click',
        () => {
            content.classList.toggle('editor-text-show');
            icon.classList.toggle('editor-text-rotated');
			
            // Add animation to content
            if (content.classList.contains('editor-text-show')) {
                content.style.animation = 'editor-text-fadeIn 0.4s ease';
			}
		});
});

// Tag storage management
function saveTagDefinition(tag, definition, mode = 'append') {
    const tags = JSON.parse(localStorage.getItem('editor-text-tags')) || {};
    
    // Ensure definition has nested_tags property
    if (!definition.nested_tags) definition.nested_tags = '';
    
    if (mode === 'replace') {
        tags[tag] = [definition];
		} else {
        if (!tags[tag]) tags[tag] = [];
        tags[tag].push(definition);
	}
    
    localStorage.setItem('editor-text-tags', JSON.stringify(tags));
    updateTagList();
    updateDictionaryTable();
}

function getTagDefinitions() {
    let tags = JSON.parse(localStorage.getItem('editor-text-tags')) || {};
    
    // Migrate old structure to new structure if needed
    for (const tag in tags) {
        const definitions = tags[tag];
        if (definitions.length > 0 && Array.isArray(definitions[0])) {
            tags[tag] = definitions.map(oldDef => ({
                keys: oldDef,
                nested_tags: ''
			}));
		}
	}
    return tags;
}

function updateTagList() {
    const tags = getTagDefinitions();
    const tagList = Object.keys(tags).map(tag => {
        const count = tags[tag].length;
        return `<span class="editor-text-tag">${tag}</span> (${count})`;
	}).join(', ');
	
    document.getElementById('editor-text-tag-list').innerHTML = tagList || 'None';
    document.getElementById('editor-text-student-tag-list').innerHTML = tagList || 'None';
}



function updateStudentTagList() {
    const container = document.getElementById('editor-text-tag-container');
    container.innerHTML = '';
    
    const tags = getTagDefinitions();
    Object.keys(tags).forEach(tag => {
        tags[tag].forEach((definition, index) => {
            const item = document.createElement('div');
            item.className = 'editor-text-aside-item';
            item.setAttribute('data-tag', tag);
            item.setAttribute('data-index', index);
            item.textContent = tags[tag].length > 1 ? `${tag} ${index+1}` : tag;
            
            
            // Add event listener
            item.addEventListener('click', function() {
				// Save cursor position regardless of focus state
				const cursorPosition = saveCursorPositionAsIndex(); // NEW: Capture position before any DOM changes
				
				const tagName = this.getAttribute('data-tag');
				const idx = this.getAttribute('data-index');
				insertTagTemplate(tagName, tags[tagName][idx], cursorPosition); // MODIFIED: Pass position
				
				this.style.backgroundColor = 'var(--editor-text-tab-active-bg)';
				setTimeout(() => {
					this.style.backgroundColor = '';
				}, 500);
			});
            
            container.appendChild(item);
		});
	});
}

// Insert tag template in Student tab
function insertTagTemplate(tag, definition, cursorPosition) {
    const editor = document.getElementById('editor-text-student-display');
    const tagContent = createTagTemplate(tag, definition);
    
    // Create temporary marker element
    const marker = document.createElement('span');
    marker.id = 'cursor-marker';
    marker.style.display = 'none';
    
    // Insert marker at cursor position
    const textBefore = editor.textContent.slice(0, cursorPosition);
    const textAfter = editor.textContent.slice(cursorPosition);
    editor.textContent = textBefore;
    editor.appendChild(marker);
    editor.appendChild(document.createTextNode(textAfter));
    
    // Insert tag content before marker
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = tagContent;
    
    // Apply styles to keys
    tempDiv.querySelectorAll('span').forEach(span => {
        // Find matching key definition
        const keyName = span.textContent.split('=')[0];
        const keyDef = definition.keys.find(k => k.name === keyName);
        if (keyDef) applyKeyStyles(keyDef, span);
    });
    
    marker.parentNode.insertBefore(tempDiv, marker);
    
    // Remove marker and set cursor
    marker.remove();
    const newCursorPos = cursorPosition + tagContent.length;
    setCursorPosition(editor, newCursorPos);
    
    // Apply styles to keys in the editor
    definition.keys.forEach(key => {
        const keyElement = document.createElement('span');
        keyElement.textContent = `${key.name}=${key.defaultValue}\n`;
        applyKeyStyles(key, keyElement);
    });
    updateLineNumbers();
}
// Utility function to capture position before any UI changes
function captureCursorPosition() {
    return saveCursorPositionAsIndex();
}

// New helper function to set cursor by text position
function setCursorPosition(element, position) {
    const range = document.createRange();
    const sel = window.getSelection();
    
    let currentPos = 0;
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
	);
    
    let node;
    while ((node = walker.nextNode())) {
        const nodeLength = node.length;
        if (position <= currentPos + nodeLength) {
            range.setStart(node, position - currentPos);
            range.collapse(true);
            break;
		}
        currentPos += nodeLength;
	}
    
    sel.removeAllRanges();
    sel.addRange(range);
}
function createTagTemplate(tag, definition) {
    let template = `\n[${tag}]\n`;
    
    // Add keys
    definition.keys.forEach(key => {
        template += `${key.name}=${key.defaultValue}\n`;
	});
    
    // Add nested tags if they exist
    if (definition.nested_tags) {
        const nestedTags = definition.nested_tags.split(',').map(t => t.trim());
        nestedTags.forEach(nestedTag => {
            template += `\n[${nestedTag}]\n`;
            // Add closing tag for nested element
            template += `[/${nestedTag}]\n`;
		});
	}
    
    template += `[/${tag}]\n`;
    return template;
}
function applyColorHighlighting(editor) {
    // Save current cursor position
    const cursorPosition = saveCursorPositionAsIndex();
    let content = editor.innerHTML;
    const tags = getTagDefinitions();
    const settings = getStyleSettings();
    
    // Apply styles to all keys in the content
    for (const tagName in tags) {
        tags[tagName].forEach(definition => {
            definition.keys.forEach(key => {
                const regex = new RegExp(`(${key.name}=[^\\s<]*)`, 'g');
                content = content.replace(regex, (match) => {
                    const span = document.createElement('span');
                    span.textContent = match;
                    applyKeyStyles(key, span);
                    return span.outerHTML;
                });
            });
        });
    }
    
    editor.innerHTML = content;
    // Restore cursor position after highlighting
    restoreCursorPositionFromIndex(cursorPosition);
}
function saveCursorPositionAsIndex() {
    const editor = document.getElementById('editor-text-student-display');
    const sel = window.getSelection();
    if (sel.rangeCount === 0) return 0;
    
    // Traverse nodes to get accurate position
    const range = sel.getRangeAt(0);
    let position = 0;
    let found = false;
    
    const walker = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT,
        null,
        false
	);
    
    let node;
    while ((node = walker.nextNode())) {
        if (node === range.startContainer) {
            position += range.startOffset;
            found = true;
            break;
		}
        position += node.length;
	}
    
    return found ? position : editor.textContent.length;
}

function getStyleSettings() {
    const defaultSettings = {
        colors: {
            string: '#000000',
            translatable: '#000000',
            integer: '#000000',
            numeric: '#000000',
            boolean: '#000000',
            path: '#000000'
        },
        bold: {
            mandatory: false,
            optional: false
        },
        italic: {
            official: false,
            umc: false
        }
    };
    
    const saved = JSON.parse(localStorage.getItem('editor-text-style-settings'));
    return saved || defaultSettings;
}

function saveStyleSettings(settings) {
    localStorage.setItem('editor-text-style-settings', JSON.stringify(settings));
}

function resetStyleSettings() {
    localStorage.removeItem('editor-text-style-settings');
    return {
        colors: {
            string: '#000000',
            translatable: '#000000',
            integer: '#000000',
            numeric: '#000000',
            boolean: '#000000',
            path: '#000000'
        },
        bold: {
            mandatory: false,
            optional: false
        },
        italic: {
            official: false,
            umc: false
        }
    };
}

function applyKeyStyles(key, element) {
    const styles = getStyleSettings();
    
    // Apply color based on type
    const color = styles.colors[key.type] || '#000000';
    element.style.color = color;
    
    // Apply bold based on mandatory
    if (styles.bold[key.mandatory]) {
        element.style.fontWeight = 'bold';
    }
    
    // Apply italic based on scope
    if (styles.italic[key.scope]) {
        element.style.fontStyle = 'italic';
    }
}

function restoreCursorPositionFromIndex(index) {
    setCursorPosition(document.getElementById('editor-text-student-display'), index);
}
function safeInsertTemplate(tag, definition) {
    const editor = document.getElementById('editor-text-student-display');
    editor.focus();
	
}
function saveCursorPosition() {
    const editor = document.getElementById('editor-text-student-display');
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0).cloneRange();
        editorCursorPosition = {
            startContainer: range.startContainer,
            startOffset: range.startOffset,
            endContainer: range.endContainer,
            endOffset: range.endOffset
		};
	}
}

function restoreCursorPosition() {
    if (!editorCursorPosition) return;
    
    const editor = document.getElementById('editor-text-student-display');
    const selection = window.getSelection();
    
    try {
        // Create a new range
        const range = document.createRange();
        range.setStart(editorCursorPosition.startContainer, editorCursorPosition.startOffset);
        range.setEnd(editorCursorPosition.endContainer, editorCursorPosition.endOffset);
        
        // Clear existing selections and add new range
        selection.removeAllRanges();
        selection.addRange(range);
		} catch (e) {
        // Fallback to end of editor
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
	}
}
/* function applyColorHighlighting(textarea) {
    const colorAssignments = getColorAssignments();
    const tags = getTagDefinitions();
    let content = textarea.value;
    // Apply color to each key in the content
    for (const tagName in tags) {
	const definitions = tags[tagName];
	definitions.forEach(definition => {
	definition.keys.forEach(key => {
	const color = colorAssignments[tagName]?.[key.name];
	if (color) {
	// Replace key with styled version
	const regex = new RegExp(`(${key.name}=)`, 'g');
	content = content.replace(regex, `<span style="color: ${color}">$1</span>`);
	}
	});
	});
    }
    // Create a temporary div to hold the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    // Update the textarea with the styled content
    textarea.value = tempDiv.textContent;
} */

// TEACHER TAB ENHANCEMENTS
document.getElementById('editor-text-add-key').addEventListener('click', function() {
    const keysContainer = document.getElementById('editor-text-keys-container');
    const keyRow = document.createElement('div');
    keyRow.className = 'editor-text-key-row';
    keyRow.innerHTML = `
    <div class="editor-text-form-group">
    <label>Key Name</label>
    <input type="text" class="editor-text-key-name" placeholder="key_name">
    </div>
	
    <div class="editor-text-form-group">
    <label>Default Value</label>
    <input type="text" class="editor-text-key-default" placeholder='""'>
    </div>
	
    <div class="editor-text-form-group">
    <label>Type</label>
    <select class="editor-text-key-type">
    <option value="string">String</option>
    <option value="translatable">Translatable String</option>
    <option value="integer">Integer</option>
    <option value="numeric">Numeric</option>
    <option value="boolean">Boolean</option>
    <option value="path">Path</option>
    </select>
    </div>
	
    <div class="editor-text-form-group">
    <label>Mandatory</label>
    <select class="editor-text-key-mandatory">
    <option value="mandatory" selected>Mandatory</option>
    <option value="optional">Optional</option>
    </select>
    </div>
	
    <div class="editor-text-form-group">
    <label>Scope</label>
    <select class="editor-text-key-scope">
    <option value="official" selected>Official</option>
    <option value="umc">UMC</option>
    </select>
    </div>
	
    <button class="editor-text-remove-key">×</button>
    `;
	
    keysContainer.appendChild(keyRow);
	
    // Add event listener to remove button
    keyRow.querySelector('.editor-text-remove-key').addEventListener('click', function() {
        keysContainer.removeChild(keyRow);
        updateTagPreview();
	});
	
    // Add input listeners for live preview
    const inputs = keyRow.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', updateTagPreview);
	});
});

// Remove key functionality
document.querySelectorAll('.editor-text-remove-key').forEach(button => {
    button.addEventListener('click', function() {
        const keyRow = this.closest('.editor-text-key-row');
        keyRow.remove();
        updateTagPreview();
	});
});

// Update tag preview
function updateTagPreview() {
    const tagName = document.getElementById('editor-text-tag-name').value || 'tag';
    const keys = [];
	
    document.querySelectorAll('.editor-text-key-row').forEach(row => {
        const name = row.querySelector('.editor-text-key-name').value || 'key';
        const defaultValue = row.querySelector('.editor-text-key-default').value || '""';
        const type = row.querySelector('.editor-text-key-type').value;
        const mandatory = row.querySelector('.editor-text-key-mandatory').value;
        const scope = row.querySelector('.editor-text-key-scope').value;
		
        keys.push({
            name, defaultValue, type, mandatory, scope
		});
	});
	
    let preview = `[${tagName}]\n`;
	
    keys.forEach(key => {
        preview += `${key.name}=${key.defaultValue} (${key.type}, ${key.mandatory}, ${key.scope})\n`;
	});
	
    preview += `[/${tagName}]`;
	
    document.getElementById('editor-text-tag-preview').textContent = preview;
}

// Add input listeners for live preview
document.getElementById('editor-text-tag-name').addEventListener('input', updateTagPreview);
document.getElementById('editor-text-tag-description').addEventListener('input', updateTagPreview);

document.querySelectorAll('.editor-text-key-name, .editor-text-key-default, .editor-text-key-type, .editor-text-key-mandatory, .editor-text-key-scope').forEach(input => {
    input.addEventListener('input', updateTagPreview);
});

// Initialize preview
updateTagPreview();

function validateTagForm() {
    const tagName = document.getElementById('editor-text-tag-name').value.trim();
    const keys = [];
    
    document.querySelectorAll('.editor-text-key-row').forEach(row => {
        const name = row.querySelector('.editor-text-key-name').value.trim();
        const defaultValue = row.querySelector('.editor-text-key-default').value;
        const type = row.querySelector('.editor-text-key-type').value;
        const mandatory = row.querySelector('.editor-text-key-mandatory').value;
        const scope = row.querySelector('.editor-text-key-scope').value;
        const commentEl = row.querySelector('.editor-text-key-comment');
        const comment = commentEl ? commentEl.value : '';
        
        if (name) {
            keys.push({
                name, defaultValue, type, mandatory, scope, comment
			});
		}
	});
	
    // FIX: Capture nested tags from form
    const nestedTags = document.getElementById('editor-text-nested-tags').value.trim();
	
    if (!tagName) {
        return { valid: false, error: 'Tag name cannot be empty' };
	}
    
    return { 
        valid: true, 
        tagName, 
        keys,
        nested_tags: nestedTags  // Include nested tags in validation result
	};
}

document.getElementById('editor-text-modal-replace').addEventListener('click', function() {
    try {
        saveTagDefinition(pendingTagName, pendingTagDefinition, 'replace');
        updateDictionaryTable();
        closeModal();
        showSaveFeedback(document.getElementById('editor-text-save-entry-btn'));
        
		} catch (error) {
        console.error('Replace error:', error);
        alert('Error replacing tag: ' + error.message);
	}
});

document.getElementById('editor-text-modal-append').addEventListener('click', function() {
    try {
        saveTagDefinition(pendingTagName, pendingTagDefinition, 'append');
        updateDictionaryTable();
        closeModal();
        showSaveFeedback(document.getElementById('editor-text-save-entry-btn'));
        
		} catch (error) {
        console.error('Append error:', error);
        alert('Error appending tag: ' + error.message);
	}
});

document.getElementById('editor-text-modal-cancel').addEventListener('click', closeModal);

// Helper functions
function closeModal() {
    document.getElementById('editor-text-save-modal').style.display = 'none';
    pendingTagName = null;
    pendingTagDefinition = null;
}

function showSaveFeedback(button) {
    button.textContent = '✓ Saved!';
    button.style.background = 'linear-gradient(to right, #4CAF50, #388E3C)';
    setTimeout(() => {
        button.textContent = '💾 Save';
        button.style.background = '';
	},
	2000);
}

// Toggle dropdown visibility
document.getElementById('editor-text-export-option').addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = this.querySelector('.editor-text-dropdown');
    const isVisible = dropdown.classList.contains('editor-text-show');
	
    // Hide all dropdowns
    document.querySelectorAll('.editor-text-dropdown').forEach(d => {
        d.classList.remove('editor-text-show');
	});
	
    // Toggle current dropdown
    if (!isVisible) {
        dropdown.classList.add('editor-text-show');
	}
});

document.getElementById('editor-text-import-option').addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = this.querySelector('.editor-text-dropdown');
    const isVisible = dropdown.classList.contains('editor-text-show');
	
    // Hide all dropdowns
    document.querySelectorAll('.editor-text-dropdown').forEach(d => {
        d.classList.remove('editor-text-show');
	});
	
    // Toggle current dropdown
    if (!isVisible) {
        dropdown.classList.add('editor-text-show');
	}
});

// Close dropdowns when clicking elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.editor-text-option')) {
        document.querySelectorAll('.editor-text-dropdown').forEach(dropdown => {
            dropdown.classList.remove('editor-text-show');
		});
	}
});

// Dropdown item click handling
document.querySelectorAll('.editor-text-dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        const format = item.getAttribute('data-format');
        const parent = item.closest('.editor-text-option');
        const action = parent.id.includes('export') ? 'Export': 'Import';
		
        alert(`${action} selected format: ${format}`);
        parent.querySelector('.editor-text-dropdown').classList.remove('editor-text-show');
	});
});

// Add hover effect to dropdown items
document.querySelectorAll('.editor-text-dropdown-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'var(--editor-text-tab-active-bg)';
	});
	
    item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = '';
	});
});

// Button hover effect
document.querySelectorAll('.editor-text-button').forEach(button => {
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-3px)';
	});
	
    button.addEventListener('mouseleave', () => {
        button.style.transform = '';
	});
});

// Option hover effect
document.querySelectorAll('.editor-text-option').forEach(option => {
    option.addEventListener('mouseenter', () => {
        option.style.transform = 'translateY(-2px)';
	});
	
    option.addEventListener('mouseleave', () => {
        option.style.transform = '';
	});
});

/* // Initialize tag list
updateTagList(); */

// MANUAL ENTRY FUNCTIONALITY
document.getElementById('editor-text-clear-btn').addEventListener('click', function() {
    document.getElementById('editor-text-manual-input').value = '';
});

document.getElementById('editor-text-parse-btn').addEventListener('click', function() {
    const manualInput = document.getElementById('editor-text-manual-input').value;
    if (!manualInput.trim()) {
        alert('Please enter some tag definitions');
        return;
	}
	
    // Parse the manual input
    const tags = parseManualInput(manualInput);
    if (tags.length === 0) {
        alert('No valid tags found. Please check your syntax.');
        return;
	}
	
    // For simplicity, we'll take the first tag
    const tag = tags[0];
	
    // Update the form with the parsed tag
    document.getElementById('editor-text-tag-name').value = tag.name;
	
    // Clear existing keys
    const keysContainer = document.getElementById('editor-text-keys-container');
    keysContainer.innerHTML = '';
	
    // Add keys from the parsed tag
    tag.keys.forEach(key => {
        const keyRow = createKeyRow();
        keysContainer.appendChild(keyRow);
		
        // Set the values
        keyRow.querySelector('.editor-text-key-name').value = key.name;
        keyRow.querySelector('.editor-text-key-default').value = key.defaultValue;
        keyRow.querySelector('.editor-text-key-type').value = key.type;
        keyRow.querySelector('.editor-text-key-mandatory').value = key.mandatory;
        keyRow.querySelector('.editor-text-key-scope').value = key.scope;
        keyRow.querySelector('.editor-text-key-comment').value = key.comment || '';
		
        // Add event listeners
        keyRow.querySelector('.editor-text-remove-key').addEventListener('click', function() {
            keysContainer.removeChild(keyRow);
            updateTagPreview();
		});
		
        const inputs = keyRow.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', updateTagPreview);
		});
	});
	
    // Update preview
    updateTagPreview();
	
    // Success feedback
    this.textContent = '✓ Parsed!';
    this.style.background = 'linear-gradient(to right, #4CAF50, #388E3C)';
    setTimeout(() => {
        this.textContent = 'Parse & Update Form';
        this.style.background = '';
	}, 2000);
});

function parseManualInput(input) {
    const tagRegex = /\[(\w+)\]([\s\S]*?)\[\/\1\]/g;
    const keyRegex = /(\w+)\s*=\s*(".*?"|\S+)\s+\(([^,]+),\s*([^,]+),\s*([^)]+)\)(?:\s*#\s*(.*))?/;
    const nestedRegex = /nested_tags\s*=\s*"([^"]+)"/i;  // Added this line
    const tags = [];
    
    let match;
    while ((match = tagRegex.exec(input)) !== null) {
        const tagName = match[1];
        const content = match[2].trim();
        const keys = [];
        let nestedTags = '';  // Added this variable
        
        // Extract nested tags (NEW)
        const nestedMatch = content.match(nestedRegex);
        if (nestedMatch) {
            nestedTags = nestedMatch[1];
		}
        
        // Extract keys
        const lines = content.split('\n');
        lines.forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#') || line.match(nestedRegex)) return;
            
            const keyMatch = line.match(keyRegex);
            if (keyMatch) {
                keys.push({
                    name: keyMatch[1],
                    defaultValue: keyMatch[2],
                    type: keyMatch[3].trim(),
                    mandatory: keyMatch[4].trim(),
                    scope: keyMatch[5].trim(),
                    comment: keyMatch[6] ? keyMatch[6].trim() : ''
				});
			}
		});
        
        tags.push({
            name: tagName,
            keys: keys,
            nested_tags: nestedTags  // Include nested tags
		});
	}
    
    return tags;
}

function parseComments(content) {
    const lines = content.split('\n');
    const comments = {};
    let currentKey = null;
	
    lines.forEach(line => {
        const trimmedLine = line.trim();
        const keyMatch = trimmedLine.match(/^(\w+)\s*=/);
        const commentMatch = trimmedLine.match(/^(#+)\s*(.*)/);
		
        if (keyMatch) {
            currentKey = keyMatch[1];
			} else if (commentMatch && commentMatch[2]) {
            if (!comments[currentKey]) {
                comments[currentKey] = [];
			}
            comments[currentKey].push(commentMatch[2]);
		}
	});
	
    return comments;
}

// Initialize default indentation settings
const DEFAULT_INDENTATION_SETTINGS = {
    method: 'tab',
    spaceSize: 4,
    tabCount: 1
};

// Function to get current indentation settings
function getIndentationSettings() {
    const saved = localStorage.getItem('editor-text-indentation-settings');
    return saved ? JSON.parse(saved) : {...DEFAULT_INDENTATION_SETTINGS};
}

// Function to save indentation settings
function saveIndentationSettings(settings) {
    localStorage.setItem('editor-text-indentation-settings', JSON.stringify(settings));
}

// Open indentation modal
document.querySelector('.editor-text-option[data-i18n="text_editor.option_indentation"]').addEventListener('click', function() {
    const settings = getIndentationSettings();
    const modal = document.getElementById('editor-text-indentation-modal');
    
    // Set current values
    document.querySelector(`input[name="indent-method"][value="${settings.method}"]`).checked = true;
    document.getElementById('editor-text-indent-size').value = settings.spaceSize;
    document.getElementById('editor-text-tab-count').value = settings.tabCount;
    
    modal.style.display = 'flex';
});

// Close indentation modal
function closeIndentationModal() {
    document.getElementById('editor-text-indentation-modal').style.display = 'none';
}

// Save indentation settings
document.getElementById('editor-text-indentation-save').addEventListener('click', function() {
    const settings = {
        method: document.querySelector('input[name="indent-method"]:checked').value,
        spaceSize: parseInt(document.getElementById('editor-text-indent-size').value) || 4,
        tabCount: parseInt(document.getElementById('editor-text-tab-count').value) || 1
    };
    
    saveIndentationSettings(settings);
    closeIndentationModal();
    alert('Indentation settings saved!');
});

// Reset to default
document.getElementById('editor-text-indentation-reset').addEventListener('click', function() {
    if (confirm('Reset to default indentation settings?')) {
        saveIndentationSettings({...DEFAULT_INDENTATION_SETTINGS});
        
        // Update UI to show defaults
        document.querySelector(`input[name="indent-method"][value="${DEFAULT_INDENTATION_SETTINGS.method}"]`).checked = true;
        document.getElementById('editor-text-indent-size').value = DEFAULT_INDENTATION_SETTINGS.spaceSize;
        document.getElementById('editor-text-tab-count').value = DEFAULT_INDENTATION_SETTINGS.tabCount;
        
        alert('Indentation settings reset to default!');
    }
});

// Cancel button
document.getElementById('editor-text-indentation-cancel').addEventListener('click', closeIndentationModal);
function createKeyRow() {
    const keyRow = document.createElement('div');
    keyRow.className = 'editor-text-key-row';
    keyRow.innerHTML = `
    <div class="editor-text-form-group">
    <label>Key Name</label>
    <input type="text" class="editor-text-key-name" placeholder="key_name">
    </div>
	
    <div class="editor-text-form-group">
    <label>Default Value</label>
    <input type="text" class="editor-text-key-default" placeholder='""'>
    </div>
	
    <div class="editor-text-form-group">
    <label>Type</label>
    <select class="editor-text-key-type">
    <option value="string">String</option>
    <option value="translatable">Translatable String</option>
    <option value="integer">Integer</option>
    <option value="numeric">Numeric</option>
    <option value="boolean">Boolean</option>
    <option value="path">Path</option>
    </select>
    </div>
	
    <div class="editor-text-form-group">
    <label>Mandatory</label>
    <select class="editor-text-key-mandatory">
    <option value="mandatory" selected>Mandatory</option>
    <option value="optional">Optional</option>
    </select>
    </div>
	
    <div class="editor-text-form-group">
    <label>Scope</label>
    <select class="editor-text-key-scope">
    <option value="official" selected>Official</option>
    <option value="umc">UMC</option>
    </select>
    </div>
	
    <div class="editor-text-form-group">
    <label>Comment</label>
    <input type="text" class="editor-text-key-comment" placeholder="Comment (optional)">
    </div>
	
    <button class="editor-text-remove-key">×</button>
    `;
    return keyRow;
}
// TEACHER DICTIONARY TABLE MANAGEMENT
function updateDictionaryTable() {
    const tbody = document.getElementById('editor-text-teacher-tag-table-body');
    tbody.innerHTML = '';
    
    const tags = getTagDefinitions();
    
    for (const tagName in tags) {
        const definitions = tags[tagName];
        definitions.forEach((definition, index) => {
            const row = document.createElement('tr');
            
            // Tag name cell
            const tagCell = document.createElement('td');
            tagCell.textContent = `[${tagName}]`;
            
            // Keys cell
            const keysCell = document.createElement('td');
            definition.keys.forEach(key => {
                // Create key badge
    const keyBadge = document.createElement('span');
    keyBadge.className = 'editor-text-teacher-badge';
    keyBadge.textContent = key.name;
                
                // Apply styles instead of just color
    applyKeyStyles(key, keyBadge);
				
                // Add comment icon if exists
    if (key.comment) {
      const commentIcon = document.createElement('span');
      commentIcon.className = 'editor-text-comment-icon';
      commentIcon.innerHTML = '💬';
      commentIcon.title = key.comment;
      keysCell.appendChild(commentIcon);
    }
    keysCell.appendChild(keyBadge);
				
                // Create mandatory badge
                const mandatoryBadge = document.createElement('span');
                mandatoryBadge.className = `editor-text-mandatory-badge editor-text-${key.mandatory}`;
                mandatoryBadge.textContent = key.mandatory === 'mandatory' ? 'M': 'O';
                keysCell.appendChild(mandatoryBadge);
				
                // Create scope badge
                const scopeBadge = document.createElement('span');
                scopeBadge.className = `editor-text-mandatory-badge editor-text-${key.scope}`;
                scopeBadge.textContent = key.scope === 'official' ? 'O': 'U';
                keysCell.appendChild(scopeBadge);
				
                // Add space between key groups
                keysCell.appendChild(document.createTextNode(' '));
			});
            
            // Nested Tags cell
            const nestedCell = document.createElement('td');
            if (definition.nested_tags) {
                nestedCell.textContent = definition.nested_tags;
                nestedCell.className = 'editor-text-nested-tags';
				} else {
                nestedCell.textContent = 'None';
                nestedCell.className = 'editor-text-no-nested';
			}
            
            // Actions cell
            const actionsCell = document.createElement('td');
            actionsCell.className = 'editor-text-teacher-actions';
            
            const editButton = document.createElement('button');
            editButton.className = 'editor-text-teacher-action-btn editor-text-teacher-action-edit';
            editButton.textContent = '✏️ Edit';
            editButton.dataset.tag = tagName;
            editButton.dataset.index = index;
			
            const deleteButton = document.createElement('button');
            deleteButton.className = 'editor-text-teacher-action-btn editor-text-teacher-action-delete';
            deleteButton.textContent = '🗑️ Delete';
            deleteButton.dataset.tag = tagName;
            deleteButton.dataset.index = index;
			
            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);
			
            
            // FIX: Correct cell order (Tag Name, Keys, Nested Tags, Actions)
            row.appendChild(tagCell);
            row.appendChild(keysCell);
            row.appendChild(nestedCell);
            row.appendChild(actionsCell);
            
            tbody.appendChild(row);
		});
	}
    
    // Attach event handlers to the new buttons
    attachEditDeleteHandlers();
}

// Helper function to determine text color based on background
function getContrastColor(bgColor) {
    if (!bgColor) return '';
    const color = bgColor.substring(1); // Remove #
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? 'var(--editor-text-text-dark)': 'white';
}
function attachEditDeleteHandlers() {
    // Edit button functionality
    document.querySelectorAll('.editor-text-teacher-action-edit').forEach(button => {
        button.addEventListener('click', function() {
            const tagName = this.dataset.tag;
            const index = this.dataset.index;
            const tags = getTagDefinitions();
            const definition = tags[tagName][index];
			
            // Load into form
            document.getElementById('editor-text-tag-name').value = tagName;
			// Load nested tags
			document.getElementById('editor-text-nested-tags').value = definition.nested_tags || '';
			
            // Clear existing keys
            const keysContainer = document.getElementById('editor-text-keys-container');
            keysContainer.innerHTML = '';
			
            // Add keys from definition
            definition.keys.forEach(key => {
                const keyRow = createKeyRow();
                keysContainer.appendChild(keyRow);
				
                keyRow.querySelector('.editor-text-key-name').value = key.name;
                keyRow.querySelector('.editor-text-key-default').value = key.defaultValue;
                keyRow.querySelector('.editor-text-key-type').value = key.type;
                keyRow.querySelector('.editor-text-key-mandatory').value = key.mandatory;
                keyRow.querySelector('.editor-text-key-scope').value = key.scope;
				
                // Add event listeners
                keyRow.querySelector('.editor-text-remove-key').addEventListener('click', function() {
                    keysContainer.removeChild(keyRow);
                    updateTagPreview();
				});
				
                const inputs = keyRow.querySelectorAll('input, select');
                inputs.forEach(input => {
                    input.addEventListener('input', updateTagPreview);
				});
			});
			
            updateTagPreview();
			
            // Scroll to form
            document.querySelector('.editor-text-teacher-form-container').scrollIntoView({
                behavior: 'smooth'
			});
		});
	});
	
    // Delete button functionality
    document.querySelectorAll('.editor-text-teacher-action-delete').forEach(button => {
        button.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this tag definition?')) {
                const tagName = this.dataset.tag;
                const index = this.dataset.index;
				
                const tags = getTagDefinitions();
                tags[tagName].splice(index, 1);
				
                // If no definitions left, remove the tag
                if (tags[tagName].length === 0) {
                    delete tags[tagName];
				}
				
                localStorage.setItem('editor-text-tags', JSON.stringify(tags));
                updateDictionaryTable();
                updateTagList();
			}
		});
	});
}
document.getElementById('editor-text-save-manual-btn').addEventListener('click', function() {
    try {
        const manualInput = document.getElementById('editor-text-manual-input').value;
        if (!manualInput.trim()) {
            alert('Please enter some tag definitions');
            return;
		}
		
        const tags = parseManualInput(manualInput);
        if (tags.length === 0) {
            alert('No valid tags found. Please check your syntax.');
            return;
		}
		
        // Check for existing tags
        const existingTags = getTagDefinitions();
        let hasExistingTags = false;
		
        for (const tag of tags) {
            if (existingTags[tag.name] && existingTags[tag.name].length > 0) {
                hasExistingTags = true;
                
                // Set pending tag information - include full definition
                pendingTagName = tag.name;
                pendingTagDefinition = {
                    keys: tag.keys,
                    nested_tags: tag.nested_tags || ''
				};
                
                // Show modal
                document.getElementById('editor-text-modal-tag-name').textContent = `[${tag.name}]`;
                document.getElementById('editor-text-save-modal').style.display = 'flex';
                break; // Show modal for first conflict
			}
		}
		
        // If no conflicts, save immediately
        if (!hasExistingTags) {
            tags.forEach(tag => {
                // Create proper definition object with nested tags
                
				// FIX: Create proper definition with nested tags
				const tagDefinition = {
					keys: tag.keys,
					nested_tags: tag.nested_tags || ''
				};
                saveTagDefinition(tag.name, tagDefinition);
			});
            
            // Show feedback
            this.textContent = '✓ Saved!';
            this.style.background = 'linear-gradient(to right, #4CAF50, #388E3C)';
            setTimeout(() => {
                this.textContent = '💾 Save Manual Entry';
                this.style.background = '';
			}, 2000);
		}
		
        // Update UI
        updateDictionaryTable();
        updateTagList();
		} catch (error) {
        console.error('Manual save error:', error);
        alert('Error saving manual entry: ' + error.message);
	}
});


// Clear form functionality
document.getElementById('editor-text-clear-form-btn').addEventListener('click', function() {
    try {
        if (!confirm(translatableStrings['text_editor.clear_confirm'])) return;
        
        // Clear inputs
        document.getElementById('editor-text-tag-name').value = '';
        document.getElementById('editor-text-tag-description').value = '';
        
        // Clear keys container but leave one row
        const keysContainer = document.getElementById('editor-text-keys-container');
        keysContainer.innerHTML = '';
        
        // Add one empty row
        const keyRow = createKeyRow();
        keysContainer.appendChild(keyRow);
        
        // Reset preview
        updateTagPreview();
        
        // Show feedback
        showTemporaryFeedback(this, '✓ ' + translatableStrings['text_editor.clear_form'], '#4CAF50');
		} catch (error) {
        console.error('Clear form error:', error);
        alert('Error clearing form: ' + error.message);
	}
});

// Parse form functionality
document.getElementById('editor-text-parse-form-btn').addEventListener('click', function() {
    try {
        updateTagPreview();
        showTemporaryFeedback(this, '✓ ' + translatableStrings['text_editor.parse_success'], '#4CAF50');
		} catch (error) {
        console.error('Parse error:', error);
        showTemporaryFeedback(this, '⚠️ ' + translatableStrings['text_editor.form_validation_error'], '#f44336');
	}
});

// Save entry functionality
document.getElementById('editor-text-save-entry-btn').addEventListener('click', function() {
    try {
        const validation = validateTagForm();
        if (!validation.valid) {
            showTemporaryFeedback(this, '⚠️ ' + validation.error, '#f44336');
            return;
		}
		
        const tags = getTagDefinitions();
        const tagName = validation.tagName;
        
        // FIX: Create proper definition with nested tags
        const tagDefinition = {
            keys: validation.keys,
            nested_tags: validation.nested_tags
		};
		
        if (tags[tagName] && tags[tagName].length > 0) {
            // Existing tag handling
            pendingTagName = tagName;
            pendingTagDefinition = tagDefinition;  // Store full definition
            document.getElementById('editor-text-modal-tag-name').textContent = `[${tagName}]`;
            document.getElementById('editor-text-save-modal').style.display = 'flex';
			} else {
            // New tag - pass full definition
            saveTagDefinition(tagName, tagDefinition);
            updateDictionaryTable();
            showTemporaryFeedback(this, '✓ ' + translatableStrings['text_editor.save_success'], '#4CAF50');
		}
		} catch (error) {
        console.error('Save entry error:', error);
        showTemporaryFeedback(this, '⚠️ ' + error.message, '#f44336');
	}
});

// Helper function for temporary feedback
function showTemporaryFeedback(element, text, color) {
    const originalText = element.textContent;
    const originalColor = element.style.background;
    
    element.textContent = text;
    element.style.background = color || '';
    element.style.fontWeight = 'bold';
    
    setTimeout(() => {
        element.textContent = originalText;
        element.style.background = originalColor;
        element.style.fontWeight = '';
	}, 2000);
}


// Open color modal
document.querySelector('.editor-text-option[data-i18n="text_editor.option_color"]').addEventListener('click', function() {
    try {
        const settings = getStyleSettings();
        
        // Set color pickers
        document.querySelectorAll('.editor-text-color-picker').forEach(picker => {
            const type = picker.dataset.type;
            picker.value = settings.colors[type] || '#000000';
        });
        
        // Set bold checkboxes
        document.querySelectorAll('.editor-text-bold-checkbox').forEach(checkbox => {
            const mandatory = checkbox.dataset.mandatory;
            checkbox.checked = settings.bold[mandatory] || false;
        });
        
        // Set italic checkboxes
        document.querySelectorAll('.editor-text-italic-checkbox').forEach(checkbox => {
            const scope = checkbox.dataset.scope;
            checkbox.checked = settings.italic[scope] || false;
        });
        
        // Show modal
        document.getElementById('editor-text-color-modal').style.display = 'flex';
    } catch (error) {
        console.error('Style modal error:', error);
        alert('Error opening style settings: ' + error.message);
    }
});

// Color modal actions
document.getElementById('editor-text-color-save').addEventListener('click', function() {
    try {
        const settings = getStyleSettings();
        
        // Save colors
        document.querySelectorAll('.editor-text-color-picker').forEach(picker => {
            const type = picker.dataset.type;
            settings.colors[type] = picker.value;
        });
        
        // Save bold settings
        document.querySelectorAll('.editor-text-bold-checkbox').forEach(checkbox => {
            const mandatory = checkbox.dataset.mandatory;
            settings.bold[mandatory] = checkbox.checked;
        });
        
        // Save italic settings
        document.querySelectorAll('.editor-text-italic-checkbox').forEach(checkbox => {
            const scope = checkbox.dataset.scope;
            settings.italic[scope] = checkbox.checked;
        });
        
        saveStyleSettings(settings);
        closeColorModal();
        updateDictionaryTable();
        
        // Re-apply styles to student editor
        const editor = document.getElementById('editor-text-student-display');
        applyColorHighlighting(editor);
    } catch (error) {
        console.error('Save styles error:', error);
        alert('Error saving styles: ' + error.message);
    }
});

/* function syncEditorContent() {
    const display = document.getElementById('editor-text-student-display');
    const input = document.getElementById('editor-text-student-input');
    // Sync from display to textarea (for saving)
    display.addEventListener('input', () => {
	input.value = display.innerText;
    });
    // Sync from textarea to display (for initial load)
    input.addEventListener('input', () => {
	display.innerHTML = input.value.replace(/\n/g, '<br>');
    });
} */

document.getElementById('editor-text-color-reset').addEventListener('click', function() {
    if (confirm('Reset all color assignments to default?')) {
        updateDictionaryTable();
        closeColorModal();
	}
});

document.getElementById('editor-text-color-cancel').addEventListener('click', closeColorModal);

/* document.getElementById('editor-text-student-input').addEventListener('input', function() {
    applyColorHighlighting(this);
}); */
document.getElementById('editor-text-student-display').addEventListener('blur', function() {
    applyColorHighlighting(this);
});
function closeColorModal() {
    document.getElementById('editor-text-color-modal').style.display = 'none';
}
// Initialize dictionary table on page load
document.addEventListener('DOMContentLoaded', function() {
    // Force initialize the WML library on page load
    initializeWmlLibrary(true);
    
    updateDictionaryTable();
    updateTagList();
    document.getElementById('editor-text-student-display').innerText = '';
    
    const editor = document.getElementById('editor-text-student-display');
    
    // Track editor focus state
    editor.addEventListener('focus', () => {
		isEditorFocused = true;
		lastCursorPosition = saveCursorPositionAsIndex(); // Store position
	});
	
	editor.addEventListener('blur', () => {
		isEditorFocused = false;
		lastCursorPosition = saveCursorPositionAsIndex(); // Store position
	});
    
    // Existing event listeners
    editor.addEventListener('keyup', saveCursorPosition);
    editor.addEventListener('mouseup', saveCursorPosition);
    updateLineNumbers();
	
});
// Translation constants
const translatableStrings = {
    "text_editor.title": "Wesnoth File Editor",
    "text_editor.subtitle": "Create and manage Wesnoth scenario files with ease",
    "text_editor.how_to_use": "How to Use",
    "text_editor.step1": "Define your tags in the Teacher tab with keys and types",
    "text_editor.step2": "Save tags to dictionary using the Save button",
    "text_editor.step3": "Switch to Student tab to create content using defined tags",
    "text_editor.step4": "Click on tags in sidebar to insert templates",
    "text_editor.step5": "Validate files in Tester tab before use",
    "text_editor.teacher_tab": "Teacher",
    "text_editor.student_tab": "Student",
    "text_editor.tester_tab": "Tester",
    "text_editor.teacher_title": "Tag Definition",
    "text_editor.dictionary": "Dictionary",
    "text_editor.dictionary_content": "Define your tags and their structure here. Each tag should have keys with specified types.",
    "text_editor.option_color": "Color",
    "text_editor.option_indentation": "Indentation",
    "text_editor.option_export": "Export",
    "text_editor.option_import": "Import",
    "text_editor.option_settings": "Settings",
    "text_editor.undo": "Undo",
    "text_editor.redo": "Redo",
    "text_editor.verify": "Verify",
    "text_editor.cancel": "Cancel",
    "text_editor.save": "Save",
    "text_editor.student_title": "Content Creation",
    "text_editor.student_dictionary_content": "Use the defined tags to create your scenario content. Click on a tag in the sidebar to insert it.",
    "text_editor.option_preview": "Preview",
    "text_editor.option_guides": "Guides",
    "text_editor.option_templates": "Templates",
    "text_editor.available_tags": "Available Tags",
    "text_editor.tester_title": "File Validation",
    "text_editor.tester_dictionary_content": "Validate your scenario files and check for errors or inconsistencies.",
    "text_editor.option_lint": "Lint",
    "text_editor.option_simulate": "Simulate",
    "text_editor.option_debug": "Debug",
    "text_editor.export_cfg": ".cfg",
    "text_editor.export_json": ".json",
    "text_editor.export_txt": ".txt",
    "text_editor.import_cfg": ".cfg",
    "text_editor.import_json": ".json",
    "text_editor.import_txt": ".txt",
    "text_editor.tooltip_color": "Change editor color scheme",
    "text_editor.tooltip_indentation": "Adjust indentation settings",
    "text_editor.tooltip_export": "Export your tag definitions",
    "text_editor.tooltip_import": "Import tag definitions",
    "text_editor.tooltip_settings": "Editor preferences",
    "text_editor.modal_title": "Tag Already Exists",
    "text_editor.modal_message": "The tag {tag} already exists. How would you like to proceed?",
    "text_editor.modal_replace": "Replace Existing",
    "text_editor.modal_append": "Add New Version",
    "text_editor.modal_cancel": "Cancel",
    "text_editor.save_manual": "Save Manual Entry",
    "text_editor.color_modal_title": "Color Assignment",
    "text_editor.color_reset": "Reset to Default",
    "text_editor.color_save": "Save Colors",
    "text_editor.color_cancel": "Cancel",
    "text_editor.color_item_tag": "Tag",
    "text_editor.color_item_key": "Key",
    "text_editor.color_item_color": "Color",
    "text_editor.define_new_tag": "Define New Tag",
    "text_editor.tag_keys": "Tag Keys",
    "text_editor.parse_form": "🔄 Parse & Update",
    "text_editor.clear_form": "🧹 Clear",
    "text_editor.save_entry": "💾 Save Entry",
    "text_editor.parse_success": "Form parsed successfully!",
"text_editor.indentation_modal_title": "Indentation Settings",
"text_editor.indentation_reset": "Reset to Default",
"text_editor.indentation_save": "Save Settings",
"text_editor.indentation_cancel": "Cancel",
"text_editor.tooltip_indentation": "Adjust indentation settings"
};