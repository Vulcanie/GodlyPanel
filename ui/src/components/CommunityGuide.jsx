import React from "react";
import { Accordion, AccordionDetails, AccordionSummary, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Typography } from "@mui/material";
import { t, useT } from "../i18n";
import { rich } from "../i18n/rich";

const P = ({ children }) => (
	<Typography variant="body2" sx={{ mb: 1 }}>
		{children}
	</Typography>
);
const Steps = ({ items }) => (
	<Typography component="ol" variant="body2" sx={{ pl: 2.5, mt: 0, mb: 1, "& li": { mb: 0.5 } }}>
		{items.map((s, i) => (
			<li key={i}>{s}</li>
		))}
	</Typography>
);
const Code = ({ children }) => (
	<Typography component="code" variant="body2" sx={{ fontFamily: "monospace", bgcolor: "action.hover", px: 0.5, borderRadius: 0.5 }}>
		{children}
	</Typography>
);

function Section({ id, title, open, onToggle, children }) {
	return (
		<Accordion expanded={open === id} onChange={() => onToggle(open === id ? null : id)} disableGutters>
			<AccordionSummary expandIcon={<span aria-hidden>▾</span>}>
				<Typography variant="subtitle2">{title}</Typography>
			</AccordionSummary>
			<AccordionDetails>{children}</AccordionDetails>
		</Accordion>
	);
}

/**
 * Written help for the community view, inside the app: what it is, how to set up each kind of address, what to do
 * afterwards, and what the usual problems mean. `port` is the number the small server uses, shown where the
 * Cloudflare dashboard asks for it.
 */
export default function CommunityGuide({ open, onClose, port }) {
	// Re-renders the guide when the language changes, so the t() text below switches with it.
	useT();
	const [section, setSection] = React.useState("what");
	// The guide's words with their bold, italic and code parts. Each sentence is one key, so a language can order it its own way.
	const text = (key, parts, vars) => rich(t(key, vars), { code: Code, ...parts });
	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
			<DialogTitle>{t("community.guide.title")}</DialogTitle>
			<DialogContent dividers>
				<Section id="what" title={t("community.guide.sec.what")} open={section} onToggle={setSection}>
					<P>{text("community.guide.what.p1")}</P>
					<P>{text("community.guide.what.p2")}</P>
					<P>{text("community.guide.what.p3")}</P>
				</Section>

				<Section id="choose" title={t("community.guide.sec.choose")} open={section} onToggle={setSection}>
					<P>{text("community.guide.choose.temporary")}</P>
					<P>{text("community.guide.choose.own")}</P>
				</Section>

				<Section id="quick" title={t("community.guide.sec.quick")} open={section} onToggle={setSection}>
					<Steps items={[t("community.guide.quick.1"), t("community.guide.quick.2"), t("community.guide.quick.3")]} />
					<P>{t("community.guide.quick.after")}</P>
				</Section>

				<Section id="token" title={t("community.guide.sec.token")} open={section} onToggle={setSection}>
					<Steps
						items={[
							text("community.guide.token.1", {
								link: (
									<Link href="https://one.dash.cloudflare.com/" target="_blank" rel="noreferrer">
										one.dash.cloudflare.com
									</Link>
								),
							}),
							t("community.guide.token.2"),
							text("community.guide.token.3"),
							text("community.guide.token.4", { url: <Code>{`localhost:${port}`}</Code> }, { port }),
							t("community.guide.token.5"),
						]}
					/>
					<P>{t("community.guide.token.after")}</P>
				</Section>

				<Section id="existing" title={t("community.guide.sec.existing")} open={section} onToggle={setSection}>
					<P>{text("community.guide.existing.intro")}</P>
					<Steps items={[text("community.guide.existing.1"), text("community.guide.existing.2"), t("community.guide.existing.3")]} />
					<P>{t("community.guide.existing.after")}</P>
				</Section>

				<Section id="after" title={t("community.guide.sec.after")} open={section} onToggle={setSection}>
					<Steps items={[t("community.guide.after.1"), t("community.guide.after.2"), t("community.guide.after.3"), t("community.guide.after.4")]} />
					<P>{t("community.guide.after.p")}</P>
				</Section>

				<Section id="trouble" title={t("community.guide.sec.trouble")} open={section} onToggle={setSection}>
					<P>{text("community.guide.trouble.waiting")}</P>
					<P>{text("community.guide.trouble.badGateway")}</P>
					<P>{text("community.guide.trouble.notFound", undefined, { port })}</P>
					<P>{text("community.guide.trouble.421")}</P>
					<P>{text("community.guide.trouble.someOnly")}</P>
					<P>{text("community.guide.trouble.port")}</P>
					<P>{text("community.guide.trouble.token")}</P>
					<P>{text("community.guide.trouble.slow")}</P>
				</Section>

				<Section id="safety" title={t("community.guide.sec.safety")} open={section} onToggle={setSection}>
					<P>{t("community.guide.safety.1")}</P>
					<P>{t("community.guide.safety.2")}</P>
					<P>{text("community.guide.safety.3")}</P>
				</Section>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>{t("common.close")}</Button>
			</DialogActions>
		</Dialog>
	);
}
