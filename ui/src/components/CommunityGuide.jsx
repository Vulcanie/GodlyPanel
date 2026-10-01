import React from "react";
import { Accordion, AccordionDetails, AccordionSummary, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Typography } from "@mui/material";

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
	const [section, setSection] = React.useState("what");
	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
			<DialogTitle>Community view: guide</DialogTitle>
			<DialogContent dividers>
				<Section id="what" title="What it is, and what your friends get" open={section} onToggle={setSection}>
					<P>
						The community view gives people outside your home one web address. They sign in as a <b>guest</b> (or make their own account with a community code) and see the dashboard: which servers are up, who is on, and how to join. That is all.
					</P>
					<P>
						It is <b>not</b> your panel on the internet. It is a separate, much smaller page. Administrators and moderators can't sign in on it, and nothing can be started, stopped, edited or deleted through it. Your panel stays on your own network, and nothing is opened on your router: GodlyPanel makes an outbound connection to Cloudflare (a "tunnel"), and Cloudflare passes visitors back down it.
					</P>
					<P>The tunnel is run by cloudflared, Cloudflare's own program. GodlyPanel starts it, keeps it running and stops it for you. Cloudflare can see the traffic that passes through its tunnel, as with any service of its kind.</P>
				</Section>

				<Section id="choose" title="Which kind of address should I pick?" open={section} onToggle={setSection}>
					<P>
						<b>A temporary link</b>: no account, nothing to buy, ready in a minute. The address is random (<Code>something-words.trycloudflare.com</Code>) and changes each time the view starts, so you'd have to send friends a new one. The page refreshes every few seconds instead of live. Good for trying it, or for a one-off.
					</P>
					<P>
						<b>Your own address</b> (for example <Code>servers.yourdomain.com</Code>): permanent, and the page updates live. It needs a free Cloudflare account and a domain whose DNS is managed by Cloudflare. If you don't have one, a domain costs a few dollars a year and can be added to Cloudflare for free. Then pick between a token (easiest) or a tunnel you already made on this PC.
					</P>
				</Section>

				<Section id="quick" title="Set up a temporary link" open={section} onToggle={setSection}>
					<Steps
						items={[
							'Choose "Set up", let it download cloudflared if it asks, and pick "A temporary link".',
							'Choose "Turn it on". After a few seconds the address appears in the card. Use "Copy".',
							"Turn on the community code (the card below) and send the generated message to your friends.",
						]}
					/>
					<P>If you turn it off and on again, or restart the panel, the address changes. The community code stays the same.</P>
				</Section>

				<Section id="token" title="Set up your own address with a token (recommended)" open={section} onToggle={setSection}>
					<Steps
						items={[
							<>
								Sign in at <Link href="https://one.dash.cloudflare.com/" target="_blank" rel="noreferrer">one.dash.cloudflare.com</Link> (Cloudflare Zero Trust; the free plan is enough) and open <i>Networks → Tunnels</i>.
							</>,
							'Choose "Create a tunnel", type "Cloudflared", give it a name (for example "godlypanel"), and save.',
							<>
								On the next page you'll see install commands for several systems. You don't run them: just copy the <b>token</b>, the very long text after <Code>--token</Code> (or after <Code>service install</Code>).
							</>,
							<>
								Open the <i>Public Hostname</i> tab and add one: a subdomain and your domain (for example <Code>servers</Code> + <Code>yourdomain.com</Code>), service type <b>HTTP</b>, URL <Code>localhost:{port}</Code>. That number is the community view's own port, not the panel's.
							</>,
							'Back here: "Set up" → "My own address, with a tunnel from the Cloudflare dashboard". Paste the token and type the full address you just made (servers.yourdomain.com), then "Turn it on".',
						]}
					/>
					<P>The address you type must match the Public Hostname exactly. The community view only answers to that name.</P>
				</Section>

				<Section id="existing" title="Set up your own address with a tunnel already on this PC" open={section} onToggle={setSection}>
					<P>
						This is for a tunnel made on the command line with <Code>cloudflared tunnel create</Code>. If you have one, "Set up" lists it. If you want a new one, the token route above is simpler.
					</P>
					<Steps
						items={[
							<>
								Make sure the address you want already points at that tunnel. In a terminal: <Code>cloudflared tunnel route dns &lt;tunnel-name&gt; servers.yourdomain.com</Code> (a one-time step, if it isn't done already).
							</>,
							<>
								<b>Stop any other program already running that tunnel</b> (for example one started by PM2, a Windows service or a script). If two programs run the same tunnel, Cloudflare splits visitors between them and about half will reach the wrong one. The card warns you if it sees this.
							</>,
							'"Set up" → "My own address, using the tunnel already on this PC", enter the address, then "Turn it on".',
						]}
					/>
					<P>GodlyPanel runs the tunnel with a settings file of its own that sends the address to the community view. It does not change your own settings file.</P>
				</Section>

				<Section id="after" title="After it is on: getting friends in" open={section} onToggle={setSection}>
					<Steps
						items={[
							'In the "Community access" card, turn on the community code. Set an expiry or a limit on sign-ups if you like.',
							'Use "Copy message" and send it. It contains the address and the code.',
							'Friends open the address, choose "I have a community code", enter the code, and pick a username and password.',
							"You see who joined under Users, and can remove anyone there. A new code stops the old one working; accounts already made stay.",
						]}
					/>
					<P>You can also make guest accounts yourself under Users and skip the code.</P>
				</Section>

				<Section id="trouble" title="If something doesn't work" open={section} onToggle={setSection}>
					<P>
						<b>"Waiting for Cloudflare to give out the address" never ends.</b> This PC couldn't reach Cloudflare. Check the internet connection, and that Windows Firewall or security software isn't blocking cloudflared (use "Details" in the card to see what it said).
					</P>
					<P>
						<b>The address shows "Bad gateway", error 1033 or 530.</b> The tunnel isn't connected. Look at the card: it should say "On". Another copy of the same tunnel running elsewhere can also cause this.
					</P>
					<P>
						<b>The address shows a plain "404" or a blank page.</b> The address in Cloudflare doesn't match the one you entered here, or it points somewhere other than <Code>localhost:{port}</Code>. For a tunnel you already had, the address must be routed to that tunnel.
					</P>
					<P>
						<b>"This address isn't served here" (421).</b> The name the visitor used isn't the one you entered in the set-up. Re-enter it exactly, or use the address the card shows.
					</P>
					<P>
						<b>It works for some people and not others.</b> Two programs are running the same tunnel; stop the other one.
					</P>
					<P>
						<b>"Port … is in use".</b> Another program is using the community view's port. Choose another in the settings (it only matters on this PC).
					</P>
					<P>
						<b>The token was refused.</b> Copy it again from the tunnel's page in the Cloudflare dashboard; it is one long line.
					</P>
					<P>
						<b>Updates seem slow.</b> On a temporary link the page checks every few seconds instead of live. A permanent address of your own updates live.
					</P>
				</Section>

				<Section id="safety" title="Safety, and turning it off" open={section} onToggle={setSection}>
					<P>Only guests can sign in on the community view, and a guest can only read status. The panel itself refuses anything that arrives through a tunnel, so pointing a tunnel at the wrong place by mistake can't expose it.</P>
					<P>Join passwords, admin passwords and server settings are never shown to guests. People who find the address can see that a sign-in page exists; they can't do anything without an account or the code.</P>
					<P>"Turn off" stops the tunnel and closes the small server straight away. Turning off the community code stops new sign-ups but doesn't remove accounts that exist.</P>
				</Section>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}
