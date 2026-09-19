AGENTS.md

Project Rules

1. Project Structure

- Create "css/" for CSS files.
- Create "js/" for JavaScript files.
- Keep "server.js" outside "js/".
- Move all CSS files into "css/".
- Move all JavaScript files into "js/", except "server.js".

2. Large Files

- Split large HTML files into smaller logical files when practical.
- Split large CSS files into smaller logical files.
- Split large JavaScript files into smaller logical files.
- Keep each file focused on one responsibility.
- Avoid unnecessarily fragmented files.

3. Comments

- Do not add normal code comments.
- Every CSS, HTML, and JavaScript file must start with one very short comment describing its purpose.
- Keep the comment minimal and factual.
- Use the native comment syntax for the file type.
- Do not use decorative comment blocks.

Example:

// Handles navigation

/* Styles navigation */

<!-- Main layout -->

4. Server Port

- Verify that "server.js" defines the server port through a variable.
- Do not hardcode the port directly inside the server startup call.
- Prefer an environment variable with a fallback value.

Example:

const PORT = process.env.PORT || 3000;

server.listen(PORT);

5. Language

- Do not use Arabic text in logs.
- Do not use Arabic as the default language for static UI text.
- If the website supports Arabic, keep translations inside the localization system.
- Keep the default language English.
- Do not hardcode translated strings throughout the application.

6. Animations

- Use animations throughout the interface.
- Add meaningful transitions to interactive elements.
- Use hover, focus, active, entrance, exit, loading, and state-change animations where appropriate.
- Keep animations smooth and consistent.
- Avoid excessive animation that harms usability or performance.

7. Icons

- Do not use emojis.
- Use icons instead of emojis for interface elements.
- Use the project's existing icon system when available.
- Keep icon style consistent across the interface.

8. Raw Code

- Keep code clean and direct.
- Avoid unnecessary abstractions.
- Avoid unnecessary wrappers and boilerplate.
- Do not add decorative code.
- Do not add unnecessary comments.
- Do not add unnecessary documentation inside source files.
- Prefer simple, readable implementations.

9. Editing Rules

- Inspect the existing code before modifying it.
- Preserve existing functionality unless the requested change requires otherwise.
- Do not rename files or APIs without a reason.
- Do not introduce duplicate functionality.
- Remove obsolete code after restructuring.
- Verify imports and references after moving files.
- Verify all HTML, CSS, and JavaScript paths after restructuring.
- Keep the final structure consistent with these rules.
