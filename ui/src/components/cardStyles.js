// How an accordion looks when it is one of a page's cards (a server's Settings tab), so it matches the cards on the
// panel's own Settings page: a bordered, rounded card with room around its text, a gap between cards, and an arrow at
// the left that points right when it is shut and down when it is open. (This version of MUI wraps the title bar in a
// heading element, so the selectors reach it as a descendant, not as a direct child.)
//
// The theme sets accordions to no padding at all because the dashboard's game tiles are built on that, so this is
// applied to the cards that want the roomier look, not to every accordion.
export const cardAccordionSx = {
	mb: 2,
	border: 1,
	borderColor: "divider",
	boxShadow: "none",
	overflow: "hidden",
	"&, &:first-of-type, &:last-of-type, &.Mui-expanded": { borderRadius: "12px" },
	// More specific than the theme's own "an open accordion has no margin", which would otherwise win.
	"&.MuiAccordion-root.Mui-expanded": { margin: "0 0 16px" },
	"& .MuiAccordionSummary-root": {
		px: 2,
		py: 1.25,
		minHeight: 48,
		flexDirection: "row-reverse",
		justifyContent: "flex-end",
		gap: 1.5,
	},
	"& .MuiAccordionSummary-root > .MuiAccordionSummary-content": { width: "auto", flexGrow: 1, minWidth: 0 },
	"& .MuiAccordionSummary-expandIconWrapper": { color: "text.secondary", transform: "rotate(-90deg)", transition: "transform 0.15s" },
	"& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": { transform: "rotate(0deg)" },
	"& .MuiAccordionDetails-root": { px: 2, pt: 0.5, pb: 2 },
};
