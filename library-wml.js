// library-wml.js
const WML_LIBRARY = {
    "part": [
        {
            "keys": [
                {
                    "name": "story",
                    "defaultValue": "\"\"",
                    "type": "translatable",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "The story text to display"
                },
                {
                    "name": "image",
                    "defaultValue": "\"\"",
                    "type": "path",
                    "mandatory": "optional",
                    "scope": "official",
                    "comment": "Path to the background image"
                }
            ],
            "nested_tags": ""
        }
    ],
    "variable": [
        {
            "keys": [
                {
                    "name": "name",
                    "defaultValue": "\"\"",
                    "type": "string",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "The name of the variable"
                },
                {
                    "name": "equals",
                    "defaultValue": "\"\"",
                    "type": "string",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "The value of the variable"
                }
            ],
            "nested_tags": ""
        },
        {
            "keys": [
                {
                    "name": "name",
                    "defaultValue": "\"\"",
                    "type": "string",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "The name of the variable"
                },
                {
                    "name": "greater_than",
                    "defaultValue": "\"\"",
                    "type": "integer",
                    "mandatory": "optional",
                    "scope": "umc",
                    "comment": "Condition: variable greater than this value"
                }
            ],
            "nested_tags": ""
        }
    ],
    "event": [
        {
            "keys": [
                {
                    "name": "name",
                    "defaultValue": "\"\"",
                    "type": "string",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "Name of the event"
                },
                {
                    "name": "description",
                    "defaultValue": "\"\"",
                    "type": "translatable",
                    "mandatory": "optional",
                    "scope": "official",
                    "comment": "Description of the event"
                },
                {
                    "name": "trigger",
                    "defaultValue": "\"\"",
                    "type": "string",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "When the event triggers"
                }
            ],
            "nested_tags": ""
        }
    ],
    "unit": [
        {
            "keys": [
                {
                    "name": "type",
                    "defaultValue": "\"\"",
                    "type": "string",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "Type of unit"
                },
                {
                    "name": "x",
                    "defaultValue": "0",
                    "type": "integer",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "X coordinate on map"
                },
                {
                    "name": "y",
                    "defaultValue": "0",
                    "type": "integer",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "Y coordinate on map"
                },
                {
                    "name": "side",
                    "defaultValue": "1",
                    "type": "integer",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "Which side the unit belongs to"
                },
                {
                    "name": "name",
                    "defaultValue": "\"\"",
                    "type": "translatable",
                    "mandatory": "optional",
                    "scope": "official",
                    "comment": "Custom name for the unit"
                }
            ],
            "nested_tags": ""
        }
    ],
    "side": [
        {
            "keys": [
                {
                    "name": "side",
                    "defaultValue": "1",
                    "type": "integer",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "Side number"
                },
                {
                    "name": "controller",
                    "defaultValue": "\"human\"",
                    "type": "string",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "Who controls this side"
                },
                {
                    "name": "team_name",
                    "defaultValue": "\"\"",
                    "type": "string",
                    "mandatory": "optional",
                    "scope": "official",
                    "comment": "Name of the team"
                }
            ],
            "nested_tags": ""
        }
    ],
    "message": [
        {
            "keys": [
                {
                    "name": "speaker",
                    "defaultValue": "\"\"",
                    "type": "string",
                    "mandatory": "optional",
                    "scope": "official",
                    "comment": "Name of the speaker"
                },
                {
                    "name": "message",
                    "defaultValue": "\"\"",
                    "type": "translatable",
                    "mandatory": "mandatory",
                    "scope": "official",
                    "comment": "The message text"
                },
                {
                    "name": "image",
                    "defaultValue": "\"\"",
                    "type": "path",
                    "mandatory": "optional",
                    "scope": "official",
                    "comment": "Portrait image for speaker"
                }
            ],
            "nested_tags": ""
        }
    ]
};

// Initialize the library
function initializeWmlLibrary(force = false) {
    try {
        const storedTags = JSON.parse(localStorage.getItem('editor-text-tags')) || {};
        let changed = false;
		
        for (const tagName in WML_LIBRARY) {
            // Always add library definitions as new versions
            WML_LIBRARY[tagName].forEach(libDef => {
                if (!storedTags[tagName]) {
                    storedTags[tagName] = [];
				}
                
                // Check if definition already exists
                const exists = storedTags[tagName].some(existingDef => 
                    JSON.stringify(existingDef) === JSON.stringify(libDef)
				);
                
                if (!exists) {
                    storedTags[tagName].push(libDef);
                    changed = true;
				}
			});
		}
		
        if (changed) {
            localStorage.setItem('editor-text-tags', JSON.stringify(storedTags));
		}
        return changed;
		} catch (e) {
        localStorage.setItem('editor-text-tags', JSON.stringify(WML_LIBRARY));
        return true;
	}
}	