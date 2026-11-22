# Mobile navigation and keyboard access

Signed-in navigation now has Dashboard, Problems, Patterns, Reviews and History links. Desktop shows links inline. Below the large-screen breakpoint, a native disclosure menu keeps the header compact. Its links have at least 44-pixel minimum height. The current section has a visual highlight and `aria-current` label. Reviews replaces the misleading Due Today label because that page also contains overdue and upcoming work.

The native summary supports keyboard activation. Escape closes the open menu and returns focus to its summary. Choosing a link closes it; leaving the disclosure with keyboard focus also closes it. Route changes reset the menu. This is an ordinary navigation disclosure, not a modal dialog, so it does not trap focus.

The first keyboard link skips the header and focuses the main-content wrapper. Interactive controls have a consistent visible focus outline. Sign out now disables repeat clicks, shows its pending state and reports failures without falsely navigating to a logged-out screen.

## Review locally

No database migration or environment changes are needed.

1. Start `npm run dev`. Sign in and check at 320px, 375px and tablet widths. Open Menu and navigate to each destination; confirm no horizontal overflow.
2. At desktop width, check inline links and the active-page highlight. Resize with the menu open and confirm navigation remains usable.
3. Reload and press Tab. Skip to main content should become visible. Press Enter, then Tab to move into page controls.
4. Focus Menu, open with Enter/Space, tab through links, and press Escape. Focus should return to the menu summary. Tabbing beyond the menu should close it.
5. Check sign-out success. Simulate a network failure and confirm an error offers a retry rather than claiming success.
6. Check the signed-out login link and recheck quiz radio buttons, search fields and buttons for visible keyboard focus.

TypeScript and ESLint are the local static checks for this change. Real browser layout, screen-reader announcements, focus movement and touch use require the checks above. This slice is not a complete accessibility audit. Full production build remains unverified because of the earlier font-download restriction.
