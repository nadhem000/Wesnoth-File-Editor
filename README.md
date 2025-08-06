# Wesnoth-File-Editor
Here's a concise description and usage guide for your GitHub project:

### Project Description
**Wesnoth File Editor** is a web-based tool designed to simplify the creation and management of Battle for Wesnoth scenario files. The application features a three-tab workflow:

1. **Teacher Tab**: Define custom WML tags with keys, types, and validation rules
2. **Student Tab**: Create scenario content using your defined tags via template insertion
3. **Tester Tab**: Validate scenario files for syntax errors before deployment

The editor includes syntax highlighting, indentation controls, tag versioning, and exports files in .cfg/.json formats. Works offline as a PWA.

### How to Use
1. **Define Tags (Teacher Tab)**:
   - Enter tag name, description, and nested tags
   - Add keys with type (string/translatable/integer/etc), scope (official/UMC), and mandatory status
   - Save definitions to the dictionary

2. **Create Content (Student Tab)**:
   - Select tags from the sidebar to insert templates
   - Edit values directly in the content editor
   - Use line numbers and syntax highlighting for reference

3. **Validate Files (Tester Tab)**:
   - Paste your scenario code
   - Use validation tools to check for errors
   - Export final .cfg files

4. **Advanced Features**:
   - **Color Coding**: Assign colors to different key types
   - **Versioning**: Maintain multiple versions of the same tag
   - **Import/Export**: Share tag definitions via JSON/CFG files
   - **Offline Use**: Works as installable PWA

### Key Features
- Visual WML tag creation
- Context-aware template insertion
- Real-time syntax validation
- Customizable editor styling
- Persistent local storage
- Responsive PWA design

The editor streamlines Wesnoth scenario development by replacing manual text editing with structured templates and validation - perfect for both new designers and veteran campaign creators.
