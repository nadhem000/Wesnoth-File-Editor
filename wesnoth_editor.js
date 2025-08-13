// ====================
// GLOBAL VARIABLES
// ====================
/**
	* Stores the tag name during save confirmation
	* @type {?string}
	* @version v0.2
*/
let pendingTagName = null;
/**
	* Stores tag definition during save confirmation
	* @type {?Object}
	* @version v0.2
*/
let pendingTagDefinition = null;
/**
	* Tracks cursor position in the editor
	* @type {?Object}
	* @version v0.2
*/
let editorCursorPosition = null;
/**
	* Indicates if editor has focus
	* @type {boolean}
	* @version v0.2
*/
let isEditorFocused = false;
/**
	* Last known cursor position
	* @type {number}
	* @version v0.2
*/
let lastCursorPosition = 0;
/**
	* Default indentation settings
	* @type {Object}
	* @property {string} method - 'tab' or 'space'
	* @property {number} spaceSize - Spaces per indent
	* @property {number} tabCount - Tabs per indent
	* @version v0.2
*/
const DEFAULT_INDENTATION_SETTINGS = {
    method: 'tab',
    spaceSize: 4,
    tabCount: 1
};
// ====================
// LINE NUMBERS MANAGEMENT
// ====================
/**
	* Updates line numbers display based on editor content
	* @version v0.2
*/
function updateLineNumbers() {
    try {
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
		} catch (error) {
        console.error('Error updating line numbers:', error);
        alert(i18n.t('text_editor.line_number_error') || 'Error updating line numbers');
	}
}
// ====================
// TAG STORAGE MANAGEMENT
// ====================
/**
	* Saves tag definition to localStorage
	* @param {string} tag - Tag name
	* @param {Object} definition - Tag structure
	* @param {string} [mode='append'] - 'replace' or 'append'
	* @version v0.2
*/
function saveTagDefinition(tag, definition, mode = 'append') {
    console.log('[SaveTag] Saving tag:', tag);
    console.log('[SaveTag] Mode:', mode);
    console.log('[SaveTag] Definition:', definition);
    try {
        const tags = JSON.parse(localStorage.getItem('editor-text-tags')) || {};
        // Ensure definition has all required properties
        definition = {
            keys: definition.keys || [],
            nested_tags: definition.nested_tags || '',
            comment: definition.comment || ''  // Add this line to preserve comments
        };
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
        console.log('[SaveTag] Tag saved successfully');
		} catch (error) {
        console.error('Error saving tag definition:', error);
        console.error('[SaveTag] Error saving tag:', error);
        throw error;
        alert(i18n.t('text_editor.save_tag_error') || 'Error saving tag definition');
	}
}
/**
	* Retrieves tag definitions from localStorage
	* @returns {Object} All stored tag definitions
	* @version v0.2
*/
function getTagDefinitions() {
    try {
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
		} catch (error) {
        console.error('Error getting tag definitions:', error);
        alert(i18n.t('text_editor.get_tag_error') || 'Error getting tag definitions');
        return {};
	}
}
/**
	* Updates tag list display in UI
	* @version v0.2
*/
function updateTagList() {
    try {
        const tags = getTagDefinitions();
        const tagList = Object.keys(tags).map(tag => {
            const count = tags[tag].length;
            return `<span class="editor-text-tag">${tag}</span> (${count})`;
		}).join(', ');
        document.getElementById('editor-text-tag-list').innerHTML = tagList || i18n.t('text_editor.none');
        document.getElementById('editor-text-student-tag-list').innerHTML = tagList || i18n.t('text_editor.none');
		} catch (error) {
        console.error('Error updating tag list:', error);
	}
}
/**
	* Updates student-side tag list UI
	* @version v0.2
*/
function updateStudentTagList() {
    try {
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
                    try {
                        const cursorPosition = saveCursorPositionAsIndex();
                        const tagName = this.getAttribute('data-tag');
                        const idx = this.getAttribute('data-index');
                        insertTagTemplate(tagName, tags[tagName][idx], cursorPosition);
                        this.style.backgroundColor = 'var(--editor-text-tab-active-bg)';
                        setTimeout(() => {
                            this.style.backgroundColor = '';
						}, 500);
						} catch (error) {
                        console.error('Error inserting tag template:', error);
                        alert(i18n.t('text_editor.insert_tag_error') || 'Error inserting tag');
					}
				});
                container.appendChild(item);
			});
		});
		} catch (error) {
        console.error('Error updating student tag list:', error);
        alert(i18n.t('text_editor.student_tag_error') || 'Error updating student tag list');
	}
}
// ====================
// EDITOR OPERATIONS
// ====================
/**
 * Finds the text node and offset at the given character index
 * @param {HTMLElement} editor - Editor element
 * @param {number} index - Character index
 * @returns {Object} { node: Node, offset: number }
 * @version v0.3
 */
function getNodeAndOffsetAt(editor, index) {
    let current = 0;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        const nodeLength = node.length;
        if (index <= current + nodeLength) {
            return { node, offset: index - current };
        }
        current += nodeLength;
    }
    // If not found, return the editor and the child count
    return { node: editor, offset: editor.childNodes.length };
}
/**
 * Inserts tag template at cursor position
 * @param {string} tag - Tag name
 * @param {Object} definition - Tag structure
 * @param {number} cursorPosition - Insertion point
 * @version v0.3
 */
function insertTagTemplate(tag, definition, cursorPosition) {
    try {
        const editor = document.getElementById('editor-text-student-display');
        let tagContent = formatWithIndentation(createTagTemplate(tag, definition));
        
        // Create a new container for the tag
        const tagContainer = document.createElement('div');
        tagContainer.className = 'editor-text-tag-container';
        tagContainer.textContent = tagContent;

        // Get insertion point
        const { node, offset } = getNodeAndOffsetAt(editor, cursorPosition);
        let afterNode = null;
        
        if (node.nodeType === Node.TEXT_NODE) {
            afterNode = node.splitText(offset);
        }
        
        // Insert as a block element
        if (node === editor) {
            editor.appendChild(tagContainer);
        } else if (node.nodeType === Node.TEXT_NODE) {
            node.parentNode.insertBefore(tagContainer, afterNode);
        } else {
            editor.appendChild(tagContainer);
        }

        const newCursorPosition = cursorPosition + tagContent.length;
        setCursorPosition(editor, newCursorPosition);
        applyColorHighlighting(editor);
        updateLineNumbers();
    } catch (error) {
        console.error('Error inserting tag template:', error);
        alert(i18n.t('text_editor.insert_template_error') || 'Error inserting tag template');
    }
}
/**
 * Formats content by applying proper indentation levels based on tag structure
 * @param {string} content - The input content to be formatted
 * @returns {string} Formatted content with proper indentation
	* @version v0.2
 */
function formatWithIndentation(content) {
    const lines = content.split('\n');
    let indentLevel = 0;
    const formattedLines = [];
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
            formattedLines.push('');
            continue;
        }
        // Decrease indent before processing closing tags
        if (trimmedLine.startsWith('[/')) {
            indentLevel = Math.max(0, indentLevel - 1);
        }
        // Add current line with indentation
        formattedLines.push(getIndentString(indentLevel) + trimmedLine);
        // Increase indent after processing opening tags
        if (trimmedLine.startsWith('[') && !trimmedLine.startsWith('[/')) {
            indentLevel++;
        }
    }
    return formattedLines.join('\n');
}
// Helper function to generate indentation string
// jscom:; Creates whitespace indentation based on current level
function getIndentString(level) {
    return '  '.repeat(level); // 2 spaces per indent level
}
/**
	* Creates HTML template for a tag
	* @param {string} tag - Tag name
	* @param {Object} definition - Tag structure
	* @returns {string} HTML template
	* @version v0.2
*/
function createTagTemplate(tag, definition) {
    try {
        let template = `[${tag}]\n`;
        // Add keys
        definition.keys.forEach(key => {
            template += `${getIndentString(1)}${key.name}=${key.defaultValue}\n`;
        });
        // Add nested tags
        if (definition.nested_tags) {
            template += '\n'; // Add separation line
            const nestedTags = definition.nested_tags.split(',').map(t => t.trim());
            nestedTags.forEach(nestedTag => {
                template += `${getIndentString(1)}[${nestedTag}]\n`;
                template += `${getIndentString(1)}[/${nestedTag}]\n`;
            });
        }
        template += `[/${tag}]\n`;
        return template;
    } catch (error) {
        console.error('Error creating tag template:', error);
        return '';
	}
}
/**
	* Captures current cursor position
	* @returns {number} Text index position
	* @version v0.2
*/
function captureCursorPosition() {
    try {
        return saveCursorPositionAsIndex();
		} catch (error) {
        console.error('Error capturing cursor position:', error);
        return 0;
	}
}
/**
	* Sets cursor to specific text index
	* @param {HTMLElement} element - Editor element
	* @param {number} position - Text index position
	* @version v0.2
*/
function setCursorPosition(element, position) {
    try {
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
		} catch (error) {
        console.error('Error setting cursor position:', error);
        // Fallback to end of editor
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
	}
}
// ====================
// STYLE MANAGEMENT
// ====================
/**
 * Applies syntax highlighting to editor
 * @param {HTMLElement} editor - Editor element
 * @version v0.3
 */
function applyColorHighlighting(editor) {
    try {
        // Save current cursor position
        const cursorPosition = saveCursorPositionAsIndex();
        let content = editor.innerHTML;
        const tags = getTagDefinitions();
        const settings = getStyleSettings();
        // Add this pattern to skip tag brackets
        const tagPattern = /(\[[^\]]+\])/g;
        content = content.replace(tagPattern, (match) => {
            return match.replace(/\[/g, '&#91;').replace(/\]/g, '&#93;');
        });
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
		} catch (error) {
        console.error('Error applying color highlighting:', error);
        alert(i18n.t('text_editor.color_highlight_error') || 'Error applying color highlighting');
	}
}
/**
	* Saves cursor position as text index
	* @returns {number} Text index position
	* @version v0.2
*/
function saveCursorPositionAsIndex() {
    try {
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
		} catch (error) {
        console.error('Error saving cursor position:', error);
        return 0;
	}
}
/**
	* Retrieves current style settings
	* @returns {Object} Color and formatting settings
	* @version v0.2
*/
function getStyleSettings() {
    try {
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
		} catch (error) {
        console.error('Error getting style settings:', error);
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
}
/**
	* Saves style settings to localStorage
	* @param {Object} settings - Style configuration
	* @version v0.2
*/
function saveStyleSettings(settings) {
    try {
        localStorage.setItem('editor-text-style-settings', JSON.stringify(settings));
		} catch (error) {
        console.error('Error saving style settings:', error);
        alert(i18n.t('text_editor.save_style_error') || 'Error saving style settings');
	}
}
/**
	* Resets style settings to defaults
	* @returns {Object} Default style settings
	* @version v0.2
*/
function resetStyleSettings() {
    try {
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
		} catch (error) {
        console.error('Error resetting style settings:', error);
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
}
/**
	* Applies styles to key elements
	* @param {Object} key - Key definition
	* @param {HTMLElement} element - DOM element to style
	* @version v0.2
*/
function applyKeyStyles(key, element) {
    try {
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
		} catch (error) {
        console.error('Error applying key styles:', error);
	}
}
// ====================
// EDITOR STATE MANAGEMENT
// ====================
/**
	* Restores cursor from text index
	* @param {number} index - Text index position
	* @version v0.2
*/
function restoreCursorPositionFromIndex(index) {
    try {
        setCursorPosition(document.getElementById('editor-text-student-display'), index);
    } catch (error) {
        console.error('Error restoring cursor position:', error);
        alert(i18n.t('text_editor.cursor_restore_error') || 'Error restoring cursor position');
    }
}
/**
	* Saves current cursor position
	* @version v0.2
*/
function saveCursorPosition() {
    try {
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
    } catch (error) {
        console.error('Error saving cursor position:', error);
    }
}
/**
	* Restores saved cursor position
	* @version v0.2
*/
function restoreCursorPosition() {
    try {
        if (!editorCursorPosition) return;
        const editor = document.getElementById('editor-text-student-display');
        const selection = window.getSelection();
        try {
            const range = document.createRange();
            range.setStart(editorCursorPosition.startContainer, editorCursorPosition.startOffset);
            range.setEnd(editorCursorPosition.endContainer, editorCursorPosition.endOffset);
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (e) {
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    } catch (error) {
        console.error('Error restoring cursor:', error);
        alert(i18n.t('text_editor.cursor_restore_error') || 'Error restoring cursor');
    }
}
// ====================
// TEACHER TAB FUNCTIONS
// ====================
/**
	* Updates tag preview display
	* @version v0.2
*/
function updateTagPreview() {
    try {
        const tagName = document.getElementById('editor-text-tag-name').value || 'tag';
        const keys = [];
        document.querySelectorAll('.editor-text-key-row').forEach(row => {
            const name = row.querySelector('.editor-text-key-name').value || 'key';
            const defaultValue = row.querySelector('.editor-text-key-default').value || '""';
            const type = row.querySelector('.editor-text-key-type').value;
            const mandatory = row.querySelector('.editor-text-key-mandatory').value;
            const scope = row.querySelector('.editor-text-key-scope').value;
            keys.push({ name, defaultValue, type, mandatory, scope });
        });
        let preview = `[${tagName}]\n`;
        keys.forEach(key => {
            preview += `${getIndentString(1)}${key.name}=${key.defaultValue} (${key.type}, ${key.mandatory}, ${key.scope})\n`;
        });
        preview += `[/${tagName}]`;
        document.getElementById('editor-text-tag-preview').textContent = preview;
    } catch (error) {
        console.error('Error updating tag preview:', error);
        alert(i18n.t('text_editor.preview_error') || 'Error updating preview');
    }
}
/**
	* Validates tag creation form
	* @returns {Object} Validation result
	* @version v0.2
*/
function validateTagForm() {
    try {
        const tagName = document.getElementById('editor-text-tag-name').value.trim();
        const keys = [];
        const nestedTags = document.getElementById('editor-text-nested-tags').value.trim();
        const tagDescription = document.getElementById('editor-text-tag-description').value.trim();
        document.querySelectorAll('.editor-text-key-row').forEach(row => {
            const name = row.querySelector('.editor-text-key-name').value.trim();
            const defaultValue = row.querySelector('.editor-text-key-default').value;
            const type = row.querySelector('.editor-text-key-type').value;
            const mandatory = row.querySelector('.editor-text-key-mandatory').value;
            const scope = row.querySelector('.editor-text-key-scope').value;
            const commentEl = row.querySelector('.editor-text-key-comment');
            const comment = commentEl ? commentEl.value : '';
            if (name) {
                keys.push({ name, defaultValue, type, mandatory, scope, comment });
            }
        });
        if (!tagName) {
            return { 
                valid: false, 
                error: i18n.t('text_editor.error_tag_name_empty') || 'Tag name cannot be empty' 
            };
        }
        console.log('[Validate] Validation successful');
        return { 
            valid: true, 
            tagName, 
            keys,
            nested_tags: nestedTags,
            comment: tagDescription  // INCLUDE AS COMMENT
        };
    } catch (error) {
        console.error('Form validation error:', error);
        console.error('[Validate] Validation error:', error);
        return {
            valid: false,
            error: i18n.t('text_editor.form_validation_error') || 'Form validation error'
        };
    }
}
/**
	* Creates key row UI component
	* @returns {HTMLElement} Key row element
	* @version v0.2
*/
function createKeyRow() {
    const keyRow = document.createElement('div');
    keyRow.className = 'editor-text-key-row';
    keyRow.innerHTML = `
    <div class="editor-text-form-group">
        <label data-i18n="text_editor.key_name_label"></label>
        <input type="text" class="editor-text-key-name" placeholder="${i18n.t('text_editor.key_name_placeholder') || 'key_name'}">
    </div>
    <div class="editor-text-form-group">
        <label data-i18n="text_editor.key_default_label"></label>
        <input type="text" class="editor-text-key-default" placeholder="${i18n.t('text_editor.default_value_placeholder') || '""'}">
    </div>
    <div class="editor-text-form-group">
        <label data-i18n="text_editor.key_type_label"></label>
        <select class="editor-text-key-type">
            <option value="string" data-i18n="text_editor.type_string"></option>
            <option value="translatable" data-i18n="text_editor.type_translatable"></option>
            <option value="integer" data-i18n="text_editor.type_integer"></option>
            <option value="numeric" data-i18n="text_editor.type_numeric"></option>
            <option value="boolean" data-i18n="text_editor.type_boolean"></option>
            <option value="path" data-i18n="text_editor.type_path"></option>
        </select>
    </div>
    <div class="editor-text-form-group">
        <label data-i18n="text_editor.key_mandatory_label"></label>
        <select class="editor-text-key-mandatory">
            <option value="mandatory" selected data-i18n="text_editor.mandatory"></option>
            <option value="optional" data-i18n="text_editor.optional"></option>
        </select>
    </div>
    <div class="editor-text-form-group">
        <label data-i18n="text_editor.key_scope_label"></label>
        <select class="editor-text-key-scope">
            <option value="official" selected data-i18n="text_editor.official"></option>
            <option value="umc" data-i18n="text_editor.umc"></option>
        </select>
    </div>
    <div class="editor-text-form-group">
        <label data-i18n="text_editor.key_comment_label"></label>
        <input type="text" class="editor-text-key-comment" placeholder="${i18n.t('text_editor.comment_placeholder') || 'Comment (optional)'}">
    </div>
    <button class="editor-text-remove-key" data-i18n="text_editor.remove_key">×</button>
    `;
    return keyRow;
}
/**
	* Updates dictionary table display
	* @version v0.2
*/
function updateDictionaryTable() {
    try {
        const tbody = document.getElementById('editor-text-teacher-tag-table-body');
        tbody.innerHTML = '';
        const tags = getTagDefinitions();
        for (const tagName in tags) {
            const definitions = tags[tagName];
            definitions.forEach((definition, index) => {
                const row = document.createElement('tr');
                
                // Tag name cell - ADD COMMENT DISPLAY HERE
                const tagCell = document.createElement('td');
                const tagContainer = document.createElement('div');
                tagContainer.style.display = 'flex';
                tagContainer.style.alignItems = 'center';
                tagContainer.textContent = `[${tagName}]`;
                
                // Add comment icon if exists
                if (definition.comment) {
                    const commentIcon = document.createElement('span');
                    commentIcon.className = 'editor-text-comment-icon';
                    commentIcon.innerHTML = '💬';
                    commentIcon.title = definition.comment;
                    commentIcon.style.marginLeft = '5px';
                    tagContainer.appendChild(commentIcon);
                }
                tagCell.appendChild(tagContainer);
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
                    mandatoryBadge.textContent = key.mandatory === 'mandatory' ? 'M' : 'O';
                    keysCell.appendChild(mandatoryBadge);
                    // Create scope badge
                    const scopeBadge = document.createElement('span');
                    scopeBadge.className = `editor-text-mandatory-badge editor-text-${key.scope}`;
                    scopeBadge.textContent = key.scope === 'official' ? 'O' : 'U';
                    keysCell.appendChild(scopeBadge);
                    // Add space between key groups
                    keysCell.appendChild(document.createTextNode(' '));
				});
                // Nested Tags cell
                const nestedCell = document.createElement('td');
                
    if (definition.nested_tags) {
        const nestedBadge = document.createElement('span');
        nestedBadge.className = 'editor-text-nested-badge';
        nestedBadge.textContent = `↳ ${definition.nested_tags}`;
        tagContainer.appendChild(nestedBadge);
    }
                // Actions cell
                const actionsCell = document.createElement('td');
                actionsCell.className = 'editor-text-teacher-actions';
                const editButton = document.createElement('button');
                editButton.className = 'editor-text-teacher-action-btn editor-text-teacher-action-edit';
                editButton.innerHTML = '✏️ <span data-i18n="text_editor.edit"></span>';
                editButton.dataset.tag = tagName;
                editButton.dataset.index = index;
                const deleteButton = document.createElement('button');
                deleteButton.className = 'editor-text-teacher-action-btn editor-text-teacher-action-delete';
                deleteButton.innerHTML = '🗑️ <span data-i18n="text_editor.delete"></span>';
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
		} catch (error) {
        console.error('Error updating dictionary table:', error);
        alert(i18n.t('text_editor.dictionary_update_error') || 'Error updating dictionary table');
	}
}
/**
	* Calculates contrast color for backgrounds
	* @param {string} bgColor - Background hex color
	* @returns {string} Optimal text color
	* @version v0.2
*/
function getContrastColor(bgColor) {
    try {
        if (!bgColor) return '';
        const color = bgColor.substring(1);
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq >= 128 ? 'var(--editor-text-text-dark)' : 'white';
    } catch (error) {
        console.error(i18n.t('text_editor.general_error') + error.message);
        return 'var(--editor-text-text-dark)';
    }
}
/**
	* Attaches edit/delete handlers to table
	* @version v0.2
*/
function attachEditDeleteHandlers() {
    try {
        document.querySelectorAll('.editor-text-teacher-action-edit').forEach(button => {
            button.addEventListener('click', function() {
                const tagName = this.dataset.tag;
                const index = this.dataset.index;
                const tags = getTagDefinitions();
                const definition = tags[tagName][index];
                document.getElementById('editor-text-tag-name').value = tagName;
                document.getElementById('editor-text-nested-tags').value = definition.nested_tags || '';
                const keysContainer = document.getElementById('editor-text-keys-container');
                keysContainer.innerHTML = '';
                definition.keys.forEach(key => {
                    const keyRow = createKeyRow();
                    keysContainer.appendChild(keyRow);
                    keyRow.querySelector('.editor-text-key-name').value = key.name;
                    keyRow.querySelector('.editor-text-key-default').value = key.defaultValue;
                    keyRow.querySelector('.editor-text-key-type').value = key.type;
                    keyRow.querySelector('.editor-text-key-mandatory').value = key.mandatory;
                    keyRow.querySelector('.editor-text-key-scope').value = key.scope;
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
                document.querySelector('.editor-text-teacher-form-container').scrollIntoView({ behavior: 'smooth' });
            });
        });
        document.querySelectorAll('.editor-text-teacher-action-delete').forEach(button => {
            button.addEventListener('click', function() {
                if (confirm(i18n.t('text_editor.confirm_delete_tag'))) {
                    const tagName = this.dataset.tag;
                    const index = this.dataset.index;
                    const tags = getTagDefinitions();
                    tags[tagName].splice(index, 1);
                    if (tags[tagName].length === 0) {
                        delete tags[tagName];
                    }
                    localStorage.setItem('editor-text-tags', JSON.stringify(tags));
                    updateDictionaryTable();
                    updateTagList();
                }
            });
        });
    } catch (error) {
        console.error(i18n.t('text_editor.general_error') + error.message);
    }
}
// ====================
// MANUAL ENTRY HANDLING
// ====================
/**
	* Parses manual tag input
	* @param {string} input - Raw tag definition
	* @returns {Array} Parsed tag objects
	* @version v0.2
*/
function parseManualInput(input) {
    try {
        console.log('[ParseManual] Starting parse');
        const tagRegex = /\[(\w+)\]([\s\S]*?)\[\/\1\]/g;
        const keyRegex = /(\w+)\s*=\s*(".*?"|\S+)\s+\(([^,]+),\s*([^,]+),\s*([^)]+)\)(?:\s*#\s*(.*))?/;
        const nestedRegex = /nested_tags\s*=\s*"([^"]+)"/i;
        const tags = [];
        let match;
        while ((match = tagRegex.exec(input)) !== null) {
            const tagName = match[1];
            const content = match[2].trim();
            const keys = [];
            let nestedTags = '';
            const nestedMatch = content.match(nestedRegex);
            let tagComment = '';
            
            // CAPTURE TAG COMMENT
            const tagCommentMatch = content.match(/^#\s*(.*)/m);
            if (tagCommentMatch) {
                tagComment = tagCommentMatch[1].trim();
            }
            if (nestedMatch) {
                nestedTags = nestedMatch[1];
            }
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
                nested_tags: nestedTags,
                comment: tagComment  // STORE TAG COMMENT
            });
        }
        console.log(`[ParseManual] Found ${tags.length} tags`);
        return tags;
    } catch (error) {
        console.error('[ParseManual] Error:', error);
        console.error(i18n.t('text_editor.general_error') + error.message);
        return [];
    }
}
/**
	* Extracts comments from content
	* @param {string} content - Text content
	* @returns {Object} Comment mappings
	* @version v0.2
*/
function parseComments(content) {
    try {
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
    } catch (error) {
        console.error(i18n.t('text_editor.general_error') + error.message);
        return {};
    }
}
// ====================
// UI UTILITIES
// ====================
/**
 * Makes the tag definition section collapsible
 * @version v0.4
 * 
 * This function adds toggle functionality to the tag definition header
 * allowing users to expand/collapse the content section with animation.
 * 
 * Structure:
 * - Section: .editor-text-tag-definition
 *   - Header: .editor-text-tag-definition-header (clickable area)
 *   - Content: .editor-text-tag-definition-content (togglable section)
 *   - Icon: .editor-text-icon (rotates when toggled)
 */
/* function makeTagDefinitionCollapsible() {
    try {
        // Get the tag definition section
        const section = document.querySelector('.editor-text-tag-definition');
        if (!section) return;
        
        // Get necessary elements within the section
        const dictionary = section.querySelector('.editor-text-dictionary');
        const header = dictionary.querySelector('.editor-text-dictionary-header');
        const content = dictionary.querySelector('.editor-text-dictionary-content');
        const icon = header.querySelector('.editor-text-icon');
        
        // Add click event to toggle visibility
        header.addEventListener('click', function() {
            // Toggle visibility class
            content.classList.toggle('editor-text-show');
            // Rotate the icon
            icon.classList.toggle('editor-text-rotated');
        });
    } catch (error) {
        console.error('Error making tag definition collapsible:', error);
    }
} */

/**
	* Shows temporary feedback message
	* @param {HTMLElement} element - Target element
	* @param {string} text - Feedback text
	* @param {string} color - Background color
	* @version v0.2
*/
function showTemporaryFeedback(element, text, color) {
    try {
        if (!element) {
            console.error('[Feedback] Element is null:', text);
            return;
        }
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
    } catch (error) {
        console.error('[Feedback] Error:', error);
        console.error(i18n.t('text_editor.general_error') + error.message);
    }
}
/**
	* Closes color settings modal
	* @version v0.2
*/
function closeColorModal() {
    try {
        document.getElementById('editor-text-color-modal').style.display = 'none';
    } catch (error) {
        console.error(i18n.t('text_editor.general_error') + error.message);
    }
}
/**
	* Closes save confirmation modal
	* @version v0.2
*/
function closeModal() {
    try {
        const modal = document.getElementById('editor-text-save-modal');
        if (modal) modal.style.display = 'none';
        pendingTagName = null;
        pendingTagDefinition = null;
    } catch (error) {
        console.error(i18n.t('text_editor.general_error') + error.message);
    }
}
/**
	* Shows save feedback animation
	* @param {HTMLElement} button - Save button element
	* @version v0.2
*/
function showSaveFeedback(button) {
    try {
        button.textContent = i18n.t('text_editor.saved_feedback');
        button.style.background = 'linear-gradient(to right, #4CAF50, #388E3C)';
        setTimeout(() => {
            button.textContent = i18n.t('text_editor.save');
            button.style.background = '';
        }, 2000);
    } catch (error) {
        console.error(i18n.t('text_editor.general_error') + error.message);
    }
}
/**
	* Retrieves indentation settings
	* @returns {Object} Current indentation config
	* @version v0.2
*/
function getIndentationSettings() {
    try {
        const saved = localStorage.getItem('editor-text-indentation-settings');
        return saved ? JSON.parse(saved) : { ...DEFAULT_INDENTATION_SETTINGS };
    } catch (error) {
        console.error(i18n.t('text_editor.general_error') + error.message);
        return { ...DEFAULT_INDENTATION_SETTINGS };
    }
}
/**
	* Saves indentation settings
	* @param {Object} settings - Indentation config
	* @version v0.2
*/
function saveIndentationSettings(settings) {
    try {
        localStorage.setItem('editor-text-indentation-settings', JSON.stringify(settings));
    } catch (error) {
        console.error(i18n.t('text_editor.general_error') + error.message);
    }
}
/**
	* Closes indentation modal
	* @version v0.2
*/
function closeIndentationModal() {
    try {
        document.getElementById('editor-text-indentation-modal').style.display = 'none';
    } catch (error) {
        console.error(i18n.t('text_editor.general_error') + error.message);
    }
}
// ====================
// INDENTATION HELPER
// ====================
/**
    * Returns the indentation string for the given level
    * @param {number} level - Indentation level
    * @returns {string} Indentation string
    * @version v0.2
*/
function getIndentString(level) {
    try {
        const settings = getIndentationSettings();
        if (settings.method === 'space') {
            return ' '.repeat(settings.spaceSize * level);
        } else {
            return '\t'.repeat(settings.tabCount * level);
        }
    } catch (error) {
        console.error('Error getting indent string:', error);
        return level > 0 ? '\t' : '';
    }
}
// ====================
// HELPERS UTILS
// ====================
// Track editor focus state
document.getElementById('editor-text-student-display').addEventListener('input', updateLineNumbers);
document.getElementById('editor-text-student-display').addEventListener('scroll', () => {
    try {
        document.getElementById('editor-text-line-numbers').scrollTop = 
		document.getElementById('editor-text-student-display').scrollTop;
		} catch (error) {
        console.error(i18n.t('text_editor.error_scroll_sync'), error);
	}
});
// Update line numbers when clearing editor
document.querySelector('.editor-text-option[data-action="clear"]').addEventListener('click', function() {
    try {
        document.getElementById('editor-text-student-display').textContent = '';
        updateLineNumbers();
		} catch (error) {
        console.error(i18n.t('text_editor.error_clearing_editor'), error);
        alert(error.message || i18n.t('text_editor.error_clearing_editor'));
	}
});
// Tab switching functionality
document.querySelectorAll('.editor-text-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        try {
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
                updateLineNumbers();
			}
			} catch (error) {
            console.error(i18n.t('text_editor.error_switching_tabs'), error);
            alert(error.message || i18n.t('text_editor.error_switching_tabs'));
		}
	});
});
// ====================
// TEACHER TAB ENHANCEMENTS
// ====================
document.getElementById('editor-text-add-key').addEventListener('click', function() {
    try {
        const keysContainer = document.getElementById('editor-text-keys-container');
        const keyRow = document.createElement('div');
        keyRow.className = 'editor-text-key-row';
        keyRow.innerHTML = `
		<div class="editor-text-form-group">
		<label data-i18n="text_editor.key_name_label"></label>
		<input type="text" class="editor-text-key-name" placeholder="${i18n.t('text_editor.key_name_placeholder')}">
		</div>
		<div class="editor-text-form-group">
		<label data-i18n="text_editor.key_default_label"></label>
		<input type="text" class="editor-text-key-default" placeholder="${i18n.t('text_editor.default_value_placeholder')}">
		</div>
		<div class="editor-text-form-group">
		<label data-i18n="text_editor.key_type_label"></label>
		<select class="editor-text-key-type">
		<option value="string" data-i18n="text_editor.type_string"></option>
		<option value="translatable" data-i18n="text_editor.type_translatable"></option>
		<option value="integer" data-i18n="text_editor.type_integer"></option>
		<option value="numeric" data-i18n="text_editor.type_numeric"></option>
		<option value="boolean" data-i18n="text_editor.type_boolean"></option>
		<option value="path" data-i18n="text_editor.type_path"></option>
		</select>
		</div>
		<div class="editor-text-form-group">
		<label data-i18n="text_editor.key_mandatory_label"></label>
		<select class="editor-text-key-mandatory">
		<option value="mandatory" selected data-i18n="text_editor.mandatory"></option>
		<option value="optional" data-i18n="text_editor.optional"></option>
		</select>
		</div>
		<div class="editor-text-form-group">
		<label data-i18n="text_editor.key_scope_label"></label>
		<select class="editor-text-key-scope">
		<option value="official" selected data-i18n="text_editor.official"></option>
		<option value="umc" data-i18n="text_editor.umc"></option>
		</select>
		</div>
		<button class="editor-text-remove-key">×</button>
        `;
        keysContainer.appendChild(keyRow);
        // Add event listener to remove button
        keyRow.querySelector('.editor-text-remove-key').addEventListener('click', function() {
            try {
                keysContainer.removeChild(keyRow);
                updateTagPreview();
				} catch (error) {
                console.error(i18n.t('text_editor.error_removing_key'), error);
                alert(error.message || i18n.t('text_editor.error_removing_key'));
			}
		});
        // Add input listeners for live preview
        const inputs = keyRow.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', updateTagPreview);
		});
		} catch (error) {
        console.error(i18n.t('text_editor.error_adding_key'), error);
        alert(error.message || i18n.t('text_editor.error_adding_key'));
	}
});
// Remove key functionality
document.querySelectorAll('.editor-text-remove-key').forEach(button => {
    button.addEventListener('click', function() {
        try {
            const keyRow = this.closest('.editor-text-key-row');
            keyRow.remove();
            updateTagPreview();
			} catch (error) {
            console.error(i18n.t('text_editor.error_removing_key'), error);
            alert(error.message || i18n.t('text_editor.error_removing_key'));
		}
	});
});
// Add input listeners for live preview
document.getElementById('editor-text-tag-name').addEventListener('input', updateTagPreview);
document.getElementById('editor-text-tag-description').addEventListener('input', updateTagPreview);
document.querySelectorAll('.editor-text-key-name, .editor-text-key-default, .editor-text-key-type, .editor-text-key-mandatory, .editor-text-key-scope').forEach(input => {
    input.addEventListener('input', updateTagPreview);
});
document.getElementById('editor-text-modal-replace').addEventListener('click', function() {
    console.log('[Modal] Replace clicked');
    try {
        saveTagDefinition(pendingTagName, pendingTagDefinition, 'replace');
        updateDictionaryTable();
        closeModal();
        showSaveFeedback(document.getElementById('editor-text-save-entry-btn'));
		} catch (error) {
        console.error(i18n.t('text_editor.error_saving_tag'), error);
        alert(i18n.t('text_editor.error_saving_tag') + ': ' + error.message);
	}
});
document.getElementById('editor-text-modal-append').addEventListener('click', function() {
    console.log('[Modal] Append clicked');
    try {
        saveTagDefinition(pendingTagName, pendingTagDefinition, 'append');
        updateDictionaryTable();
        closeModal();
        showSaveFeedback(document.getElementById('editor-text-save-entry-btn'));
		} catch (error) {
        console.error(i18n.t('text_editor.error_saving_tag'), error);
        alert(i18n.t('text_editor.error_saving_tag') + ': ' + error.message);
	}
});
document.getElementById('editor-text-modal-cancel').addEventListener('click', closeModal);
// Toggle dropdown visibility
document.getElementById('editor-text-export-option').addEventListener('click', function(e) {
    try {
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
		} catch (error) {
        console.error(i18n.t('text_editor.error_toggling_dropdown'), error);
	}
});
document.getElementById('editor-text-import-option').addEventListener('click', function(e) {
    try {
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
		} catch (error) {
        console.error(i18n.t('text_editor.error_toggling_dropdown'), error);
	}
});
// Close dropdowns when clicking elsewhere
document.addEventListener('click', (e) => {
    try {
        if (!e.target.closest('.editor-text-option')) {
            document.querySelectorAll('.editor-text-dropdown').forEach(dropdown => {
                dropdown.classList.remove('editor-text-show');
			});
		}
		} catch (error) {
        console.error(i18n.t('text_editor.error_closing_dropdowns'), error);
	}
});
// Dropdown item click handling
document.querySelectorAll('.editor-text-dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
        try {
            e.stopPropagation();
            const format = item.getAttribute('data-format');
            const parent = item.closest('.editor-text-option');
            const action = parent.id.includes('export') ? i18n.t('text_editor.export') : i18n.t('text_editor.import');
            alert(`${action} ${i18n.t('text_editor.selected_format')}: ${format}`);
            parent.querySelector('.editor-text-dropdown').classList.remove('editor-text-show');
			} catch (error) {
            console.error(i18n.t('text_editor.error_handling_dropdown'), error);
		}
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
// ====================
// MANUAL ENTRY FUNCTIONALITY
// ====================
document.getElementById('editor-text-clear-btn').addEventListener('click', function() {
    try {
        document.getElementById('editor-text-manual-input').value = '';
		} catch (error) {
        console.error(i18n.t('text_editor.error_clearing_input'), error);
	}
});
document.getElementById('editor-text-parse-btn').addEventListener('click', function() {
    try {
        console.log('[Manual Parse] Button clicked - starting manual parse');
        const manualInput = document.getElementById('editor-text-manual-input').value;
        console.log('[Manual Parse] Manual input:', manualInput);
        
        if (!manualInput.trim()) {
            console.warn('[Manual Parse] Input is empty');
            alert(i18n.t('text_editor.manual_enter_tags'));
            return;
        }
        
        console.log('[Manual Parse] Parsing input...');
        const tags = parseManualInput(manualInput);
        console.log('[Manual Parse] Parsed tags:', tags);
        
        if (tags.length === 0) {
            console.warn('[Manual Parse] No tags found');
            alert(i18n.t('text_editor.manual_no_tags_found'));
            return;
        }
        
        console.log('[Manual Parse] Parsed successfully');
        this.textContent = '✓ ' + i18n.t('text_editor.parse_success');
        this.style.background = 'linear-gradient(to right, #4CAF50, #388E3C)';
        
        setTimeout(() => {
            this.textContent = i18n.t('text_editor.parse_form');
            this.style.background = '';
        }, 2000);
    } catch (error) {
        console.error('[Manual Parse] Error:', error);
        alert(i18n.t('text_editor.error_parsing_manual') + ': ' + error.message);
    }
});
// ====================
// INDENTATION SETTINGS
// ====================
document.querySelector('.editor-text-option[data-i18n="text_editor.option_indentation"]').addEventListener('click', function() {
    try {
        const settings = getIndentationSettings();
        const modal = document.getElementById('editor-text-indentation-modal');
        // Set current values
        document.querySelector(`input[name="indent-method"][value="${settings.method}"]`).checked = true;
        document.getElementById('editor-text-indent-size').value = settings.spaceSize;
        document.getElementById('editor-text-tab-count').value = settings.tabCount;
        modal.style.display = 'flex';
		} catch (error) {
        console.error(i18n.t('text_editor.error_opening_indentation'), error);
        alert(i18n.t('text_editor.error_opening_indentation') + ': ' + error.message);
	}
});
// Save indentation settings
document.getElementById('editor-text-indentation-save').addEventListener('click', function() {
    try {
        const settings = {
            method: document.querySelector('input[name="indent-method"]:checked').value,
            spaceSize: parseInt(document.getElementById('editor-text-indent-size').value) || 4,
            tabCount: parseInt(document.getElementById('editor-text-tab-count').value) || 1
		};
        saveIndentationSettings(settings);
        closeIndentationModal();
        // Update preview and editor
        updateTagPreview();
        updateStudentTagList();
        alert(i18n.t('text_editor.indentation_saved'));
		} catch (error) {
        console.error(i18n.t('text_editor.error_saving_indentation'), error);
        alert(i18n.t('text_editor.error_saving_indentation') + ': ' + error.message);
	}
});
// Reset to default
document.getElementById('editor-text-indentation-reset').addEventListener('click', function() {
    try {
        if (confirm(i18n.t('text_editor.reset_indentation_confirm'))) {
            saveIndentationSettings({...DEFAULT_INDENTATION_SETTINGS});
            // Update UI to show defaults
            document.querySelector(`input[name="indent-method"][value="${DEFAULT_INDENTATION_SETTINGS.method}"]`).checked = true;
            document.getElementById('editor-text-indent-size').value = DEFAULT_INDENTATION_SETTINGS.spaceSize;
            document.getElementById('editor-text-tab-count').value = DEFAULT_INDENTATION_SETTINGS.tabCount;
            alert(i18n.t('text_editor.indentation_reset'));
		}
		} catch (error) {
        console.error(i18n.t('text_editor.error_resetting_indentation'), error);
        alert(i18n.t('text_editor.error_resetting_indentation') + ': ' + error.message);
	}
});
// Cancel button
document.getElementById('editor-text-indentation-cancel').addEventListener('click', closeIndentationModal);
// ====================
// TEACHER DICTIONARY TABLE
// ====================
document.getElementById('editor-text-save-manual-btn').addEventListener('click', function() {
    try {
        const manualInput = document.getElementById('editor-text-manual-input').value;
        if (!manualInput.trim()) {
            alert(i18n.t('text_editor.manual_enter_tags'));
            return;
		}
        const tags = parseManualInput(manualInput);
        if (tags.length === 0) {
            alert(i18n.t('text_editor.manual_no_tags_found'));
            return;
		}
        // Check for existing tags
        const existingTags = getTagDefinitions();
        let hasExistingTags = false;
        for (const tag of tags) {
            if (existingTags[tag.name] && existingTags[tag.name].length > 0) {
                hasExistingTags = true;
                pendingTagName = tag.name;
                pendingTagDefinition = {
                    keys: tag.keys,
                    nested_tags: tag.nested_tags || '',
                    comment: tag.comment || ''  // ADD COMMENT SUPPORT
                };
                
                // ADD NULL CHECK BEFORE ACCESSING ELEMENT
                const tagNameElement = document.getElementById('editor-text-modal-tag-name');
                if (tagNameElement) {
                    tagNameElement.textContent = `[${tag.name}]`;
                }
                
                // ADD NULL CHECK BEFORE SHOWING MODAL
                const saveModal = document.getElementById('editor-text-save-modal');
                if (saveModal) {
                    saveModal.style.display = 'flex';
                }
                break; // Show modal for first conflict
            }
        }
        // If no conflicts, save immediately
        if (!hasExistingTags) {
            tags.forEach(tag => {
                const tagDefinition = {
                    keys: tag.keys,
                    nested_tags: tag.nested_tags || ''
				};
                saveTagDefinition(tag.name, tagDefinition);
			});
            // Show feedback
            this.textContent = i18n.t('text_editor.saved_feedback');
            this.style.background = 'linear-gradient(to right, #4CAF50, #388E3C)';
            setTimeout(() => {
                this.textContent = i18n.t('text_editor.save_manual');
                this.style.background = '';
			}, 2000);
		}
        // Update UI
        updateDictionaryTable();
        updateTagList();
		} catch (error) {
        console.error(i18n.t('text_editor.error_saving_manual'), error);
        alert(i18n.t('text_editor.error_saving_manual') + ': ' + error.message);
	}
});
// Clear form functionality
document.getElementById('editor-text-clear-form-btn').addEventListener('click', function() {
    try {
        if (!confirm(i18n.t('text_editor.clear_confirm'))) return;
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
        showTemporaryFeedback(this, '✓ ' + i18n.t('text_editor.clear_form'), '#4CAF50');
		} catch (error) {
        console.error(i18n.t('text_editor.error_clearing_form'), error);
        alert(i18n.t('text_editor.error_clearing_form') + ': ' + error.message);
	}
});
// Parse form functionality
document.getElementById('editor-text-parse-form-btn').addEventListener('click', function() {
    try {
        updateTagPreview();
        showTemporaryFeedback(this, '✓ ' + i18n.t('text_editor.parse_success'), '#4CAF50');
		} catch (error) {
        console.error(i18n.t('text_editor.error_parsing_form'), error);
        showTemporaryFeedback(this, '⚠️ ' + i18n.t('text_editor.form_validation_error'), '#f44336');
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
    const tagDefinition = {
      keys: validation.keys,
      nested_tags: validation.nested_tags,
      comment: validation.comment
    };

    if (tags[tagName] && tags[tagName].length > 0) {
      pendingTagName = tagName;
      pendingTagDefinition = tagDefinition;
      
      // Set tag name in modal
      const modalTagName = document.getElementById('editor-text-modal-tag-name');
      if (modalTagName) {
        modalTagName.textContent = `[${tagName}]`;
      }
      
      // Show modal
      const saveModal = document.getElementById('editor-text-save-modal');
      if (saveModal) {
        saveModal.style.display = 'flex';
      }
    } else {
      saveTagDefinition(tagName, tagDefinition);
      showTemporaryFeedback(this, '✓ ' + i18n.t('text_editor.save_success'), '#4CAF50');
    }
  } catch (error) {
    console.error('Error saving entry:', error);
    showTemporaryFeedback(this, '⚠️ ' + error.message, '#f44336');
  }
});
// ====================
// COLOR SETTINGS
// ====================
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
        console.error(i18n.t('text_editor.error_opening_styles'), error);
        alert(i18n.t('text_editor.error_opening_styles') + ': ' + error.message);
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
        console.error(i18n.t('text_editor.error_saving_styles'), error);
        alert(i18n.t('text_editor.error_saving_styles') + ': ' + error.message);
	}
});
document.getElementById('editor-text-color-reset').addEventListener('click', function() {
    try {
        if (confirm(i18n.t('text_editor.reset_colors_confirm'))) {
            updateDictionaryTable();
            closeColorModal();
		}
		} catch (error) {
        console.error(i18n.t('text_editor.error_resetting_colors'), error);
	}
});
document.getElementById('editor-text-color-cancel').addEventListener('click', closeColorModal);
document.getElementById('editor-text-student-display').addEventListener('blur', function() {
    try {
        applyColorHighlighting(this);
		} catch (error) {
        console.error(i18n.t('text_editor.error_applying_styles'), error);
	}
});
// ====================
// COLLAPSIBLE SECTIONS
// ====================
function setupExpandableSections() {
    try {
        // Handle How To sections
        document.querySelectorAll('.editor-text-howto').forEach(section => {
            const header = section.querySelector('.editor-text-howto-header');
            const content = section.querySelector('.editor-text-howto-content');
            const icon = header.querySelector('.editor-text-icon');
            
            header.addEventListener('click', () => {
                content.classList.toggle('editor-text-show');
                icon.classList.toggle('editor-text-rotated');
            });
        });

        // Handle ALL dictionary headers (including nested ones)
        document.querySelectorAll('.editor-text-dictionary-header').forEach(header => {
            const section = header.closest('.editor-text-dictionary');
            const content = section.querySelector('.editor-text-dictionary-content');
            const icon = header.querySelector('.editor-text-icon');
            
            header.addEventListener('click', () => {
                content.classList.toggle('editor-text-show');
                icon.classList.toggle('editor-text-rotated');
            });
        });
    } catch (error) {
        console.error('Error setting up expandable sections:', error);
    }
}
// ====================
// TRANSLATION FUNCTION
// ====================
/**
 * Unified translation handler for both data-i18n attributes and i18n.t() calls
 * @version v1.0
 */
function handleTranslations() {
    // Initialize i18n object if not exists
    window.i18n = window.i18n || {
        t: function(key) {
            return (translatableStrings && translatableStrings[key]) || key;
        }
    };
    
    // Process all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        
        const translation = i18n.t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = translation;
        } else {
            el.textContent = translation;
        }
    });
}

// ====================
// INITIALIZATION
// ====================
document.addEventListener('DOMContentLoaded', function() {
    try {
    /* const tagDefSection = document.querySelector('.editor-text-tag-definition');
    const tagDefHeader = tagDefSection.querySelector('.editor-text-dictionary-header');
    const tagDefContent = tagDefSection.querySelector('.editor-text-dictionary-content');
    const tagDefIcon = tagDefHeader.querySelector('.editor-text-icon'); */
    /* 
    tagDefHeader.addEventListener('click', () => {
        tagDefContent.classList.toggle('editor-text-show');
        tagDefIcon.classList.toggle('editor-text-rotated');
    }); */
        
    console.log('[Init] DOMContentLoaded');
    
    // Check if save button exists
    const saveBtn = document.getElementById('editor-text-save-entry-btn');
    if (!saveBtn) {
        console.error('[Init] Save entry button not found!');
    }
    
    // Check if modal elements exist
    if (!document.getElementById('editor-text-save-modal')) {
        console.error('[Init] Save modal not found!');
    }
    
    if (!document.getElementById('editor-text-modal-tag-name')) {
        console.error('[Init] Modal tag name element not found!');
    }
    handleTranslations();
        initializeWmlLibrary(true);
        updateDictionaryTable();
        updateTagList();
    /* makeTagDefinitionCollapsible() */;
        
    setupExpandableSections();
        document.getElementById('editor-text-student-display').innerText = '';
        const editor = document.getElementById('editor-text-student-display');
        // Track editor focus state
        editor.addEventListener('focus', () => {
            isEditorFocused = true;
            lastCursorPosition = saveCursorPositionAsIndex();
		});
        editor.addEventListener('blur', () => {
            isEditorFocused = false;
            lastCursorPosition = saveCursorPositionAsIndex();
		});
        // Existing event listeners
        editor.addEventListener('keyup', saveCursorPosition);
        editor.addEventListener('mouseup', saveCursorPosition);
        updateLineNumbers();
		} catch (error) {
        console.error(i18n.t('text_editor.error_initializing'), error);
        alert(i18n.t('text_editor.error_initializing') + ': ' + error.message);
	}
});