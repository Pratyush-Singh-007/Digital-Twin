# AgriTwin design system

## Direction

AgriTwin is a practical field-operations dashboard. The interface should feel calm, professional, and easy to scan, with the data and operator decisions taking priority over decoration. Keep the canvas, navigation, and surfaces grayscale. Use restrained semantic colors for statuses and a small set of distinct chart series. Avoid decorative color, gradients, glass effects, oversized display type, and ornamental animation.

## Design references

| Reference | Useful pattern | Application |
| --- | --- | --- |
| Clerk Mosaic product UI | Compact navigation, predictable controls, clear hierarchy | Use a system sans stack, consistent control sizing, spacing rhythm, and visible focus states. Do not reproduce Clerk branding or components. |
| IBM Carbon data visualization | Stable chart scales, clear legends, reference lines, and annotations | Keep chart roles consistent and explain model outputs in the view. |
| Material 3 color roles | Named surface, text, border, and state roles | Use semantic tokens for light and dark themes without adopting Material's visual styling. |
| Clerk Seed marketing UI | Editorial typography and storytelling | Keep this dashboard compact; use concise page headings instead of a marketing-style hero. |
| Glass, neumorphism, and neo-brutalism | High decoration or low-contrast depth | Avoid; both compete with operational data and safety cues. |

## Color

Use a strictly grayscale foundation. The light theme uses a near-white canvas, white content surfaces, near-black text, and subtle gray borders. The dark theme uses charcoal surfaces with white text. Navigation uses one dark gray surface to establish structure.

| Token role | Light theme | Dark theme | Use |
| --- | --- | --- | --- |
| Canvas | `#F4F4F5` | `#18181B` | App background |
| Surface | `#FFFFFF` | `#27272A` | Cards and panels |
| Border | `#E4E4E7` | `#52525B` | Dividers and control outlines |
| Primary text | `#18181B` | `#FAFAFA` | Headings and key values |
| Secondary text | `#52525B` | `#D4D4D8` | Supporting copy and chart labels |
| Strong neutral | `#3F3F46` | `#A1A1AA` | Navigation, actions, and data contrast |

Use color only when it carries meaning. Green marks healthy, safe, or successful states; amber marks caution; red marks hazards, failures, or unsafe comparison outcomes; blue identifies forecasts and sensor gaps. Keep backgrounds, navigation, panels, and most text grayscale. Pair each color with a label, icon, or line style so meaning does not rely on color alone.

## Type and layout

- Use the system sans stack for navigation, headings, body text, and controls. Use monospace sparingly for units, coordinates, timestamps, thresholds, and compact telemetry labels.
- Use sentence case for headings and action text. Uppercase is reserved for short technical labels.
- Keep headings compact and pages scannable. Show the current view and key operational state before supporting detail.
- Use a 4px spacing base and a responsive 12-column desktop grid that collapses naturally on narrow screens.
- Group related measurements together. Keep charts and controls flat within simple cards rather than using decorative bento layouts.
- Use modest corners: 6–8px on controls and around 12px on cards. Prefer fine borders and little or no shadow.
- Interactive targets should be at least 40px high, with 44px preferred on touch layouts. Icon-only controls need an accessible label and visible keyboard focus.

## Data and safety

- Keep measurements neutral where possible. Give forecasts, safety status, and comparison series consistent semantic colors, and distinguish them with labels and line style.
- Keep units, scales, legends, and interval assumptions visible. Label forecast ranges as nominal unless empirical coverage has been validated for that context.
- Keep actuator state near the top of the dashboard. State the action, reason, and rule that fired; never rely on color alone.
- The field visualization is a supporting, data-linked overview. Numeric values and chart labels remain the source for precise readings.
- Use amber or red for faults and high-risk states, with clear labels and icons so meaning remains easy to identify.

## Interaction

- Use brief, subtle transitions for hover and state changes. Avoid ambient motion and parallax in monitoring views.
- Respect `prefers-reduced-motion`; preserve visible keyboard focus.
- Keep controls familiar and direct. Do not hide important state behind hover-only interactions.
