import { For, Show, createRenderEffect, createSignal, createEffect } from "solid-js"
import { Layout as RootLayout } from "@src/pages/Layout.jsx"
import { Markdown, parseMarkdown } from "@src/services/markdown/index.js"
import type { ProcessedTableOfContents } from "./index.page.server.jsx"
import { currentPageContext } from "@src/renderer/state.js"
import { Callout } from "@src/services/markdown/src/tags/Callout.jsx"
import type SlDetails from "@shoelace-style/shoelace/dist/components/details/details.js"
import { Meta, Title } from "@solidjs/meta"
import { Feedback } from "./Feedback.jsx"
import { defaultLanguage } from "@src/renderer/_default.page.route.js"
import { useI18n } from "@solid-primitives/i18n"

/**
 * The page props are undefined if an error occurred during parsing of the markdown.
 */
export type PageProps = {
	processedTableOfContents: ProcessedTableOfContents
	markdown: Awaited<ReturnType<typeof parseMarkdown>>
	headings: any[]
}

export function Page(props: PageProps) {
	let mobileDetailMenu: SlDetails | undefined
	const [renderedHeadings, setRenderedHeadings] = createSignal<any[]>([])

	createRenderEffect(() => {
		setRenderedHeadings([])

		if (!props.headings) return

		for (const heading of props.headings) {
			setRenderedHeadings((prev) => [...prev, heading.children[0]])
		}
	})

	return (
		<>
			{/* frontmatter is undefined on first client side nav  */}
			<Title>{props.markdown?.frontmatter?.title}</Title>
			<Meta name="description" content={props.markdown?.frontmatter?.description} />
			<Meta name="og:image" content="/images/inlang-social-image.jpg" />
			<RootLayout>
				{/* important: the responsive breakpoints must align throughout the markup! */}
				<div class="flex flex-col grow md:grid md:grid-cols-4 gap-10 w-full">
					{/* desktop navbar */}
					{/* 
          hacking the left margins to apply bg-surface-2 with 100rem 
              (tested on an ultrawide monitor, works!) 
          */}
					<div class="hidden md:block h-full -ml-[100rem] pl-[100rem] border-r-[1px] border-surface-2">
						<nav class="sticky top-12 max-h-[96vh] overflow-y-scroll overflow-scrollbar">
							{/* `Show` is a hotfix when client side rendering loaded this page
							 * filteredTableContents is not available on the client.
							 */}
							<div class="py-14 pr-8">
								<Show when={props.processedTableOfContents}>
									<NavbarCommon {...props} headings={renderedHeadings()} />
								</Show>
							</div>
						</nav>
					</div>
					{/* Mobile navbar */}
					<nav class="fixed min-w-full z-10 -translate-x-4 sm:-translate-x-10 sm:px-6 md:hidden overflow-y-scroll overflow-auto backdrop-blur-sm">
						<sl-details ref={mobileDetailMenu}>
							<h3 slot="summary" class="font-medium">
								Menu
							</h3>
							{/* `Show` is a hotfix when client side rendering loaded this page
							 * filteredTableContents is not available on the client.
							 */}
							<Show when={props.processedTableOfContents}>
								<NavbarCommon
									{...props}
									headings={renderedHeadings()}
									onLinkClick={() => {
										mobileDetailMenu?.hide()
									}}
								/>
							</Show>
						</sl-details>
					</nav>
					<Show
						when={props.markdown?.renderableTree}
						fallback={<p class="text-danger">{props.markdown?.error}</p>}
					>
						{/* 
            rendering on the website is broken due to relative paths and 
            the escaping of html. it is better to show the RFC's on the website
            and refer to github for the rendered version than to not show them at all. 
          */}
						<div class="w-full justify-self-center mb-8 md:p-6 md:col-span-3">
							<Show when={currentPageContext.urlParsed.pathname.includes("rfc")}>
								<Callout variant="warning">
									<p>
										The rendering of RFCs on the website might be broken.{" "}
										<a href="https://github.com/inlang/inlang/tree/main/rfcs" target="_blank">
											Read the RFC on GitHub instead.
										</a>
									</p>
								</Callout>
							</Show>
							<div
								// change the col-span to 2 if a right side nav bar should be rendered
								class="w-full justify-self-center md:col-span-3"
							>
								<Markdown renderableTree={props.markdown.renderableTree!} />
								<Feedback />
							</div>
						</div>
					</Show>
				</div>
			</RootLayout>
		</>
	)
}

function NavbarCommon(props: {
	processedTableOfContents: PageProps["processedTableOfContents"]
	headings: PageProps["headings"]
	onLinkClick?: () => void
}) {
	const [highlightedAnchor, setHighlightedAnchor] = createSignal<string | undefined>("")
	const [, { locale }] = useI18n()

	const getLocale = () => {
		const language = locale() || defaultLanguage
		return language !== defaultLanguage ? "/" + language : ""
	}

	const isSelected = (href: string) => {
		if (href === currentPageContext.urlParsed.pathname) {
			return true
		} else {
			return false
		}
	}

	const onAnchorClick = (anchor: string) => {
		setHighlightedAnchor(anchor)
	}

	createEffect(() => {
		if (
			currentPageContext.urlParsed.hash &&
			props.headings
				.toString()
				.toLowerCase()
				.replaceAll(" ", "-")
				.includes(currentPageContext.urlParsed.hash.replace("#", ""))
		) {
			setHighlightedAnchor(currentPageContext.urlParsed.hash.replace("#", ""))
		}
	})

	return (
		<ul role="list" class="w-full">
			<For each={Object.keys(props.processedTableOfContents)}>
				{(section) => (
					<li class="py-3">
						<h2 class="tracking-wide pt-2 text-sm font-semibold text-on-surface pb-2">{section}</h2>
						<ul class="space-y-2" role="list">
							<For
								each={
									props.processedTableOfContents[
										section as keyof typeof props.processedTableOfContents
									]
								}
							>
								{(document) => (
									<li>
										<a
											onClick={props.onLinkClick}
											class={
												(isSelected(document.frontmatter.href)
													? "text-primary font-semibold "
													: "text-info/80 hover:text-on-background ") +
												"tracking-wide text-sm block w-full font-normal"
											}
											href={getLocale() + document.frontmatter.href}
										>
											{document.frontmatter.shortTitle}
										</a>
										{props.headings &&
											props.headings.length > 1 &&
											isSelected(document.frontmatter.href) && (
												<ul class="mt-2 mb-6">
													<For each={props.headings}>
														{(heading) =>
															heading !== undefined &&
															heading !== document.frontmatter.shortTitle &&
															props.headings.filter((h) => h === heading).length < 2 && (
																<li>
																	<a
																		onClick={() => {
																			onAnchorClick(
																				heading.toString().toLowerCase().replaceAll(" ", "-"),
																			)
																			props.onLinkClick?.()
																		}}
																		class={
																			"text-sm tracking-widem block w-full border-l pl-3 py-1 hover:border-l-info/80 " +
																			(highlightedAnchor() ===
																			heading.toString().toLowerCase().replaceAll(" ", "-")
																				? "font-medium text-info/80 border-l-info/80 "
																				: "text-info/60 hover:text-info/80 font-normal border-l-info/10 ")
																		}
																		href={`#${heading
																			.toString()
																			.toLowerCase()
																			.replaceAll(" ", "-")}`}
																	>
																		{heading}
																	</a>
																</li>
															)
														}
													</For>
												</ul>
											)}
									</li>
								)}
							</For>
						</ul>
					</li>
				)}
			</For>
		</ul>
	)
}
