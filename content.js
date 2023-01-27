const extensions = {};
function init(){
	const exts = [
		CommentPicker,
		FullscreenChat,
		ChatTickerScroll
	];
	for(let ex of exts){
		extensions[ex.name] = ex;
	}
	YoutubeEvent.addEventListener("storageLoad",()=>{
		YoutubeEvent.dispatchEvent("exLoad");
	});
}

// Youtube CommentPicker
class CommentPicker extends Ext {
	static name = "CommentPicker";
	static description = this.i18n("Description");
	static optionsV = 0;
	static style = `
		#chat {
			overflow: hidden;
		}
		#chat > #item-list[data-ext-yc="${this.name}"] {
			flex: unset;
			max-height: 30%;
			border-top: 1px solid rgba(255,255,255,0.1);
		}
		#chat > #item-list[data-ext-yc="${this.name}"] #live-chat-item-list-panel {
			position: relative;
			display: block;
			flex: 1;
			overflow: hidden;
			z-index: 0;
		}
		#chat > #item-list[data-ext-yc="${this.name}"] #contents {
			position: unset;
			height: 100%;
		}
		#chat > #item-list[data-ext-yc="${this.name}"] #item-scroller {
			flex: unset;
			overflow-y: scroll;
			padding-right: 0;
		}
		#chat > #item-list[data-ext-yc="${this.name}"] #items {
			position: unset;
			padding: unset;
		}
	`;
	static container = `
		<div id="live-chat-item-list-panel" class="style-scope yt-live-chat-renderer">
			<div id="contents" class="style-scope yt-live-chat-item-list-renderer">
				<div id="item-scroller" class="style-scope yt-live-chat-item-list-renderer animated">
					<div id="item-offset" class="style-scope yt-live-chat-item-list-renderer">
						<div id="items" class="style-scope yt-live-chat-item-list-renderer"></div>
					</div>
				</div>
			</div>
		</div>
	`;
	static anchor = false;
	static opts = {};
	static autoScrolling = false;
	static userScrolling = false;
	static baseItems;
	static addedItems;
	static observers = {};
	static registOptions(wrapper){
		(new DOMTemplate(wrapper))
			.ins("append","caption",{
				captionInput: "toggle",
				captionDescription: this.i18n("Owner"),
				toggleOptionName: `${this.name}-opt-owner`,
				toggleChecked: (Storage.getOption(`${this.name}-opt-owner`,true)?" checked":"")
			},true)
			.on({q:"#ext-yc-toggle",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),e.target.getAttribute("checked") != null);
			}})
			.q(null)
			.ins("append","caption",{
				captionInput: "toggle",
				captionDescription: this.i18n("Verified"),
				toggleOptionName: `${this.name}-opt-verified`,
				toggleChecked: (Storage.getOption(`${this.name}-opt-verified`,true)?" checked":"")
			},true)
			.on({q:"#ext-yc-toggle",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),e.target.getAttribute("checked") != null);
			}})
			.q(null)
			.ins("append","caption",{
				captionInput: "toggle",
				captionDescription: this.i18n("Moderator"),
				toggleOptionName: `${this.name}-opt-moderator`,
				toggleChecked: (Storage.getOption(`${this.name}-opt-moderator`,false)?" checked":"")
			},true)
			.on({q:"#ext-yc-toggle",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),e.target.getAttribute("checked") != null);
			}});
	}
	static optionsUpdated(opts){
		if(YoutubeState.isChatFrame()){
			Object.assign(this.opts,opts);
			this.observers.items.disconnect();
			Array.from(this.addedItems.childNodes).forEach(node=>{
				const replacement = this.baseItems.querySelector(`*[data-comment-id="${node.id}"]`);
				replacement.after(node);
				replacement.remove();
			});
			this.anchor = false;
			this.itemsCallback([{addedNodes:Array(...this.baseItems.children),removedNodes:[]}]);
			this.observers.items.observe(this.baseItems,{childList:true});
		}
	}
	static init(){
		if(YoutubeState.isChatFrame()){
			YoutubeEvent.addEventListener("load",()=>{
				this.setStyle(this.style);
				this.opts["opt-owner"] = Storage.getOption(`${this.name}-opt-owner`,true);
				this.opts["opt-verified"] = Storage.getOption(`${this.name}-opt-verified`,true);
				this.opts["opt-moderator"] = Storage.getOption(`${this.name}-opt-moderator`,false);

				const wrapper = document.querySelector("#chat > #item-list");
				this.baseItems = wrapper.querySelector("#items");
				const newWrapper = document.createElement("div");
				newWrapper.id = "item-list";
				newWrapper.classList.add("style-scope","yt-live-chat-renderer");
				this.tagAddedDOM(newWrapper);
				wrapper.after(newWrapper);
				newWrapper.insertAdjacentHTML("beforeend",this.container);
				new DOMTemplate(newWrapper.querySelector("#contents")).ins("append","ytIconButton",{id:"show-more",domTag:"yt-live-chat-item-list-renderer",svg:"downArrow"},true).a("disabled","");
				this.addedItems = newWrapper.querySelector("#items");

				window.addEventListener("resize",this.resizeEvent);
				this.addedItems.closest("#item-scroller").addEventListener("scroll",this.scrollEvent);
				this.addedItems.closest("#item-scroller").nextElementSibling.addEventListener("click",this.scrollBottom);

				this.anchor = false;
				this.itemsCallback([{addedNodes:Array(...this.baseItems.children),removedNodes:[]}]);
				if(!this.observers.list){
					this.observers.list = new MutationObserver(this.listCallback);
				}
				if(!this.observers.items){
					this.observers.items = new MutationObserver(this.itemsCallback);
				}
				this.observers.list.observe(wrapper,{childList:true});
				this.observers.items.observe(this.baseItems,{childList:true});
			});
		}
	}
	static deinit(){
		if(YoutubeState.isChatFrame()){
			this.observers.list.disconnect();
			this.observers.items.disconnect();
			this.addedItems.closest("#item-scroller").nextElementSibling.removeEventListener("click",this.scrollBottom);
			this.addedItems.closest("#item-scroller").removeEventListener("scroll",this.scrollEvent);
			window.removeEventListener("resize",this.resizeEvent);
			Array.from(this.addedItems.childNodes).forEach(node=>{
				const replacement = this.baseItems.querySelector(`*[data-comment-id="${node.id}"]`);
				replacement.after(node);
				replacement.remove();
			});
			this.removeAddedDOM();
		}
	}
	static listCallback = (mutationList)=>{
		mutationList.forEach(mutation=>{
			if(mutation.addedNodes.length){
				this.baseItems = mutation.addedNodes[0].querySelector("#items");
				this.observers.items.observe(this.baseItems,{childList:true});
			}else if(mutation.removedNodes.length){
				this.observers.items.disconnect();
				while(this.addedItems.firstChild) this.addedItems.removeChild(this.addedItems.firstChild);
				const addedScroller = this.addedItems.closest("#item-scroller");
				if(addedScroller.scrollTop == addedScroller.scrollHeight - addedScroller.clientHeight){
					this.scrollEvent();
				}
			}
		});
	}
	static itemsCallback = (mutationList)=>{
		mutationList.forEach(mutation=>{
			if(mutation.addedNodes.length){
				mutation.addedNodes.forEach(node=>{
					if(
						this.opts["opt-owner"] && node.querySelector("#author-name.owner") ||
						this.opts["opt-verified"] && node.querySelector('yt-live-chat-author-badge-renderer[type="verified"]') ||
						this.opts["opt-moderator"] && node.querySelector('yt-live-chat-author-badge-renderer[type="moderator"]') || 
						this.anchor == true && !node.classList.contains("fixedComment")
					){
						const liveAnchor = this.opts["opt-owner"] && node.querySelector("#author-name.owner") && YoutubeState.isLiveStreaming();
						const prevCheck = (elm)=>{
							if(elm.querySelector("#message").innerText.match(/\↑/g)){
								prevCheck(elm.previousElementSibling);
								this.pickComment(elm.previousElementSibling);
							}
						}
						if(liveAnchor){
							prevCheck(node);
						}
						if((liveAnchor || this.anchor) && node.querySelector("#message").innerText.match(/\↓/g)){
							this.anchor = true;
						}else{
							this.anchor = false;
						}
						this.pickComment(node);
					}
				});
			}else if(mutation.removedNodes.length){
				mutation.removedNodes.forEach(node=>{
					if(Array.from(node.classList).includes("fixedComment")){
						const picked = this.addedItems.querySelector(`*[id="${node.dataset.commentId}"]`)
						if(picked){
							picked.remove();
						}
						const addedScroller = this.addedItems.closest("#item-scroller");
						if(addedScroller.scrollTop == addedScroller.scrollHeight - addedScroller.clientHeight){
							this.scrollEvent();
						}
					}
				});
			}
		});
	}
	static pickComment(elm){
		const replacement = document.createElement("yt-live-chat-text-message-renderer");
		replacement.classList.add("fixedComment");
		replacement.dataset.commentId = elm.id;
		elm.after(replacement);
		replacement.querySelector("#content > #message").innerText = this.i18n("ReplaceText");
		replacement.querySelector("#menu").setAttribute("hidden","");
		const addedScroller = this.addedItems.closest("#item-scroller");
		const scrolling = addedScroller.scrollTop < addedScroller.scrollHeight - addedScroller.clientHeight;
		this.addedItems.append(elm);
		const baseScroller = this.baseItems.closest("#item-scroller");
		baseScroller.scrollTo({"top":baseScroller.scrollHeight-baseScroller.clientHeight});
		if(!scrolling){
			this.autoScrolling = addedScroller.scrollTop;
			addedScroller.scrollTo({"top":addedScroller.scrollHeight-addedScroller.clientHeight,"behavior":"smooth"});
		}
	}
	static scrollEvent = (e)=>{
		const addedScroller = this.addedItems.closest("#item-scroller");
		if(this.autoScrolling !== false){
			if(this.autoScrolling < addedScroller.scrollTop && addedScroller.scrollTop < addedScroller.scrollHeight - addedScroller.clientHeight){
				this.autoScrolling = addedScroller.scrollTop;
			}else{
				this.autoScrolling = false;
			}
		}else{
			if(addedScroller.scrollTop == addedScroller.scrollHeight - addedScroller.clientHeight){
				addedScroller.nextElementSibling.setAttribute("disabled","");
				setTimeout(()=>{
					addedScroller.nextElementSibling.style.visibility = "hidden";
					this.userScrolling = false;
				},150);
			}else{
				addedScroller.nextElementSibling.removeAttribute("disabled");
				addedScroller.nextElementSibling.style.visibility = "visible";
				this.userScrolling = true;
			}
		}
	}
	static resizeEvent = (e)=>{
		const addedScroller = this.addedItems.closest("#item-scroller");
		if(!this.userScrolling){
			this.autoScrolling = addedScroller.scrollTop;
			addedScroller.scrollTo({top:addedScroller.scrollHeight-addedScroller.clientHeight,behavior:"smooth"});
		}else{
			this.scrollEvent();
		}
	}
	static scrollBottom = (e)=>{
		const addedScroller = this.addedItems.closest("#item-scroller");
		addedScroller.scrollTo({top:addedScroller.scrollHeight-addedScroller.clientHeight});
	}
}
// Youtube FullscreenChat
class FullscreenChat extends Ext {
	static name = "FullscreenChat";
	static description = this.i18n("Description");
	static optionsV = 2;
	static styles = {
		top: `
			body.no-scroll #columns #secondary {
				position: unset;
			}
			
			body.no-scroll ytd-live-chat-frame#chat {
				margin: 0;
				position: absolute;
				border: none;
				overflow: hidden;
			}
			
			body.no-scroll ytd-live-chat-frame#chat :not(iframe#chatframe) {
				display: none;
			}


			body.no-scroll[chat-docking] #player-theater-container {
				width: calc(100vw - 400px);
			}
			body.no-scroll[chat-docking] #player-theater-container .html5-video-player {
				overflow: inherit;
				z-index: unset;
			}
			body.no-scroll[chat-docking] #player-theater-container .html5-video-container {
				position: absolute;
				display: flex;
				height: 100vh;
			}
			body.no-scroll[chat-docking] #player-theater-container .html5-video-container > video {
				width: calc(100vw - 400px)!important;	/* TODO */
				height: unset!important;
				position: unset;
				margin: auto;
			}
			body.no-scroll[chat-docking] #player-theater-container .ytp-storyboard-framepreview .ytp-storyboard-framepreview-img {
				width: 100vw;
				transform: scale(calc((1920 - 400 - 3) / 1920));	/* TODO */
				transform-origin: left;
			}
			body.no-scroll[chat-docking] #player-theater-container .ytp-offline-slate {
				position: relative;
				width: 100vw;
				height: 100vh;
				scale: calc((1920 - 400 - 3) / 1920);
				transform-origin: left;
			}
			body.no-scroll[chat-docking] #player-theater-container .ytp-iv-video-content {
				width: calc(100vw - 400px)!important;	/* TODO */
			}
			body.no-scroll[chat-docking] #player-theater-container .ytp-gradient-bottom {
				width: 100vw;
				z-index: 602;
			}
			body.no-scroll[chat-docking] #player-theater-container .ytp-chrome-bottom {
				z-index: 602;
			}
			body.no-scroll[chat-docking] ytd-live-chat-frame#chat {
				border-radius: unset;
			}
			body.no-scroll[chat-docking] ytd-live-chat-frame#chat:hover {
				z-index: 603;
			}
			body.no-scroll[chat-docking] ytd-live-chat-frame#chat > iframe {
				border-radius: unset;
			}
		`,
		child: {
			base: `
				html.fullscreen:not([chat-docking]) yt-live-chat-pinned-message-renderer > #message {
					z-index: 0;
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-toast-renderer {
					z-index: -1;
				}
				html.fullscreen:not([chat-docking]) :is(
					yt-live-chat-banner-manager,
					yt-live-chat-text-message-renderer > #menu
				) {
					background: none;
				}

				html.fullscreen:not([chat-docking]) :is(
					yt-live-chat-renderer,
					yt-live-chat-header-renderer,
					yt-live-chat-message-input-renderer,
					yt-live-chat-text-message-renderer[author-is-owner],
					yt-live-chat-ticker-renderer,
					yt-live-chat-toast-renderer[is-showing-message],
					yt-live-chat-restricted-participation-renderer > #container,
					yt-live-chat-viewer-engagement-message-renderer > #card,
					yt-live-chat-paid-message-renderer > #card > #header,
					yt-live-chat-paid-message-renderer > #card > #content,
					yt-live-chat-paid-sticker-renderer > #card,
					yt-live-chat-membership-item-renderer > #card > #header,
					yt-live-chat-membership-item-renderer > #card > #content,
					ytd-sponsorships-live-chat-gift-purchase-announcement-renderer > #header > #header,
					yt-live-chat-participant-list-renderer > #header,
					#ext-yc-options-wrapper > #header,
					#ext-yc-card,
					#ext-yc-options-wrapper > #footer,
					#ext-yc-options-wrapper > #footer > tp-yt-paper-button
				):not(.yt-live-chat-banner-renderer) {
					background: none;
				}

				html.fullscreen :is(
					yt-live-chat-renderer,
					yt-live-chat-header-renderer,
					yt-live-chat-message-input-renderer,
					yt-live-chat-text-message-renderer[author-is-owner],
					yt-live-chat-ticker-renderer,
					yt-live-chat-toast-renderer[is-showing-message],
					yt-live-chat-restricted-participation-renderer > #container,
					yt-live-chat-viewer-engagement-message-renderer > #card,
					yt-live-chat-paid-message-renderer > #card > #header,
					yt-live-chat-paid-message-renderer > #card > #content,
					yt-live-chat-paid-sticker-renderer > #card,
					yt-live-chat-membership-item-renderer > #card > #header,
					yt-live-chat-membership-item-renderer > #card > #content,
					ytd-sponsorships-live-chat-gift-purchase-announcement-renderer > #header > #header,
					yt-live-chat-participant-list-renderer > #header,
					#ext-yc-options-wrapper > #header,
					#ext-yc-card,
					#ext-yc-options-wrapper > #footer,
					#ext-yc-options-wrapper > #footer > tp-yt-paper-button
				):not(.yt-live-chat-banner-renderer) {
					position: relative;
					overflow: hidden;
				}

				html.fullscreen:not([chat-docking]) yt-live-chat-renderer > iron-pages > *:not(yt-live-chat-ninja-message-renderer):before {
					background-color: var(--yt-live-chat-background-color);
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-header-renderer:before {
					background-color: var(--yt-live-chat-header-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-message-input-renderer:before {
					background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-text-message-renderer[author-is-owner]:before {
					background-color: var(--yt-live-chat-message-highlight-background-color);
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-ticker-renderer:before {
					background-color: var(--yt-live-chat-header-background-color);
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-toast-renderer[is-showing-message]:before {
					background-color: var(--yt-live-chat-toast-background-color);
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-restricted-participation-renderer > #container:before {
					background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-viewer-engagement-message-renderer > #card:before {
					background-color: var(--yt-live-chat-vem-background-color);
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-paid-message-renderer > #card > #header:before {
					background-color: var(--yt-live-chat-paid-message-header-background-color,#125aac);
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-paid-message-renderer > #card > #content:before {
					background-color: var(--yt-live-chat-paid-message-background-color,#1565c0);
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-paid-sticker-renderer > #card:before {
					background-color: var(--yt-live-chat-paid-sticker-background-color);
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-membership-item-renderer > #card > #header:before {
					background-color: var(--yt-live-chat-sponsor-header-color);
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-membership-item-renderer[show-only-header] > #card > #header:before {
					background-color: var(--yt-live-chat-sponsor-color);
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-membership-item-renderer > #card > #content:before {
					background-color: var(--yt-live-chat-sponsor-color);
				}
				html.fullscreen:not([chat-docking]) ytd-sponsorships-live-chat-gift-purchase-announcement-renderer > #header > #header:before {
					background-color: var(--yt-live-chat-sponsor-color);
				}
				html.fullscreen:not([chat-docking]) yt-live-chat-participant-list-renderer > #header:before {
					background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
				}
				html.fullscreen:not([chat-docking]) #ext-yc-options-wrapper > #header:before {
					background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
				}
				html.fullscreen:not([chat-docking]) #ext-yc-card:before {
					background-color: var(--yt-live-chat-vem-background-color);
				}
				html.fullscreen:not([chat-docking]) #ext-yc-options-wrapper > #footer:before {
					background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
				}
				html.fullscreen:not([chat-docking]) #ext-yc-options-wrapper > #footer > tp-yt-paper-button:before {
					background-color: var(--yt-live-chat-vem-background-color);
				}

				html.fullscreen #chat {
					padding-right: 7px;
					--scrollbar-width: 7px;
				}
				html.fullscreen :is(
					yt-live-chat-participant-list-renderer #participants,
					#ext-yc-options
				) {
					margin-right: 7px;
					--scrollbar-width: 7px;
				}
				html.fullscreen :is(
					#chat #item-list #item-scroller,
					#participants,
					#ext-yc-options
				) {
					padding-right: 7px;
				}
				html.fullscreen :is(
					#chat #item-list #item-scroller,
					#participants,
					#ext-yc-options
				):hover {
					overflow-y: scroll;
					padding-right: 0;
				}
				html.fullscreen :is(
					#chat #item-list #item-scroller,
					#participants,
					#ext-yc-options
				)::-webkit-scrollbar {
					width: 0;
				}
				html.fullscreen :is(
					#chat #item-list #item-scroller,
					#participants,
					#ext-yc-options
				):hover::-webkit-scrollbar {
					width: var(--scrollbar-width);
				}
				html.fullscreen :is(
					#chat #item-list #item-scroller,
					#participants,
					#ext-yc-options
				)::-webkit-scrollbar-track {
					background-color: transparent;
				}
				html.fullscreen :is(
					#chat #item-list #item-scroller,
					#participants,
					#ext-yc-options
				)::-webkit-scrollbar-thumb {
					border-radius: 10px;
					border-color: transparent;
					background-color: hsl(0, 0%, 67%);
				}
				html.fullscreen :is(
					#chat #item-list #item-scroller,
					#participants,
					#ext-yc-options
				)::-webkit-scrollbar-thumb:hover {
					background-color: hsl(0, 0%, 44%);
				}


				html:not(.fullscreen) #chat-messages yt-live-chat-header-renderer > yt-icon-button#overflow:first-of-type {
					display: none;
				}
				#chat-messages yt-live-chat-header-renderer > yt-icon-button#overflow:first-of-type button {
					cursor: grab;
				}
				#chat-messages yt-live-chat-header-renderer > yt-icon-button#overflow:first-of-type button:active {
					cursor: grabbing;
				}
				
				html.fullscreen:not([chat-docking]) yt-live-chat-ninja-message-renderer {	/* TODO */
					display: none;
				}

				#resizeButton {
					position: absolute;
					display: none;
					top: 0;
					left: 0;
					bottom: 0;
					right: 0;
					grid-template-columns: 8px 1fr 8px;
					grid-template-rows: 8px 1fr 8px;
					pointer-events: none;
				}
				html.fullscreen:not([chat-docking]) #resizeButton {	/* TODO */
					display: grid;
				}
				#resizeButton > * {
					margin: 0;
					padding: 0;
					background: none;
					border: none;
					outline: none;
					pointer-events: auto;
				}
				#resizeButton > :is(:nth-child(1),:nth-child(9)) {
					width: 8px;
					height: 8px;
					cursor: nwse-resize;
				}
				#resizeButton > :is(:nth-child(2),:nth-child(8)) {
					height: 5px;
					cursor: ns-resize;
				}
				#resizeButton > :is(:nth-child(3),:nth-child(7)) {
					width: 8px;
					height: 8px;
					cursor: nesw-resize;
				}
				#resizeButton > :is(:nth-child(4),:nth-child(6)) {
					width: 5px;
					cursor: ew-resize;
				}
				#resizeButton > :nth-child(5) {
					visibility: hidden;
				}
				#resizeButton > :nth-child(6) {
					margin-left: auto;
				}
				#resizeButton > :nth-child(8) {
					margin-top: auto;
				}
			`,
			textOutline: `
				html.fullscreen:not([chat-docking]) :is(
					:is(
						yt-live-chat-header-renderer,
						yt-live-chat-participant-list-renderer #header,
						#ext-yc-options-wrapper #header,
						iron-pages#panel-pages
					) svg,
					yt-live-chat-text-message-renderer #message img
				) {
					filter: 
						drop-shadow(1px 1px .5px var(--yt-live-chat-background-color))
						drop-shadow(-1px 1px .5px var(--yt-live-chat-background-color))
						drop-shadow(1px -1px .5px var(--yt-live-chat-background-color))
						drop-shadow(-1px -1px .5px var(--yt-live-chat-background-color));
				}
				html.fullscreen:not([chat-docking]) :is(
					#label-text.yt-dropdown-menu,
					#input-panel,
					#ext-yc-options-wrapper,
					yt-live-chat-text-message-renderer:not([author-type="owner"]),
					yt-live-chat-text-message-renderer[author-type="owner"] #content > :not(yt-live-chat-author-chip),
					ytd-sponsorships-live-chat-gift-redemption-announcement-renderer,
					yt-live-chat-viewer-engagement-message-renderer
				) {
					text-shadow: 
						1px 1px 1.5px var(--yt-live-chat-background-color),
						-1px 1px 1.5px var(--yt-live-chat-background-color),
						1px -1px 1.5px var(--yt-live-chat-background-color),
						-1px -1px 1.5px var(--yt-live-chat-background-color);
				}
				html.fullscreen:not([chat-docking]) #card #header {
					text-shadow: 
						1px 1px 1.5px var(--yt-live-chat-paid-message-header-background-color,var(--yt-live-chat-sponsor-header-color,#1565c0)),
						-1px 1px 1.5px var(--yt-live-chat-paid-message-header-background-color,var(--yt-live-chat-sponsor-header-color,#1565c0)),
						1px -1px 1.5px var(--yt-live-chat-paid-message-header-background-color,var(--yt-live-chat-sponsor-header-color,#1565c0)),
						-1px -1px 1.5px var(--yt-live-chat-paid-message-header-background-color,var(--yt-live-chat-sponsor-header-color,#1565c0));
				}
				html.fullscreen:not([chat-docking]) #card #content:not(.yt-live-chat-viewer-engagement-message-renderer) {
					text-shadow: 
						1px 1px 1.5px var(--yt-live-chat-paid-message-background-color,var(--yt-live-chat-sponsor-color,#1565c0)),
						-1px 1px 1.5px var(--yt-live-chat-paid-message-background-color,var(--yt-live-chat-sponsor-color,#1565c0)),
						1px -1px 1.5px var(--yt-live-chat-paid-message-background-color,var(--yt-live-chat-sponsor-color,#1565c0)),
						-1px -1px 1.5px var(--yt-live-chat-paid-message-background-color,var(--yt-live-chat-sponsor-color,#1565c0));
				}
				html.fullscreen:not([chat-docking]) ytd-sponsorships-live-chat-header-renderer #header {
					text-shadow: 
						1px 1px 1.5px var(--yt-live-chat-sponsor-color),
						-1px 1px 1.5px var(--yt-live-chat-sponsor-color),
						1px -1px 1.5px var(--yt-live-chat-sponsor-color),
						-1px -1px 1.5px var(--yt-live-chat-sponsor-color);
				}
			`,
			fontSize: `
				html.fullscreen yt-live-chat-text-message-renderer {
					font-size: [[fontSize]]px;
				}
			`,
			backgroundBlur: `
				html.fullscreen:not([chat-docking]) yt-live-chat-renderer > iron-pages > * {
					backdrop-filter: blur([[backgroundBlur]]px);
				}
			`,
			opacityDef: `
				html.fullscreen:not([chat-docking]) yt-live-chat-banner-renderer > yt-live-interactivity-component-background,
				html.fullscreen:not([chat-docking]) :is(
					yt-live-chat-renderer > iron-pages > *:not(yt-live-chat-ninja-message-renderer),
					yt-live-chat-header-renderer,
					yt-live-chat-message-input-renderer,
					yt-live-chat-text-message-renderer[author-is-owner],
					yt-live-chat-ticker-renderer,
					yt-live-chat-toast-renderer[is-showing-message],
					yt-live-chat-restricted-participation-renderer > #container,
					yt-live-chat-participant-list-renderer > #header,
					#ext-yc-options-wrapper > #header,
					#ext-yc-card,
					#ext-yc-options-wrapper > #footer,
					#ext-yc-options-wrapper > #footer > tp-yt-paper-button
				):not(.yt-live-chat-banner-renderer):before {
					content: "";
					position: absolute;
					width: 100%;
					height: 100%;
					top: 0;
					left: 0;
					z-index: -1;
					opacity: [[opacityDef]];
				}
			`,
			opacityHover: `
				html.fullscreen:not([chat-docking]):hover yt-live-chat-banner-renderer > yt-live-interactivity-component-background,
				html.fullscreen:not([chat-docking]):hover :is(
					yt-live-chat-renderer > iron-pages > *:not(yt-live-chat-ninja-message-renderer),
					yt-live-chat-header-renderer,
					yt-live-chat-message-input-renderer,
					yt-live-chat-text-message-renderer[author-is-owner],
					yt-live-chat-ticker-renderer,
					yt-live-chat-toast-renderer[is-showing-message],
					yt-live-chat-restricted-participation-renderer > #container,
					yt-live-chat-participant-list-renderer > #header,
					#ext-yc-options-wrapper > #header,
					#ext-yc-card,
					#ext-yc-options-wrapper > #footer,
					#ext-yc-options-wrapper > #footer > tp-yt-paper-button
				):not(.yt-live-chat-banner-renderer):before {
					opacity: [[opacityHover]];
					transition: opacity .2s;
				}
			`,
			cardOpacityDef: `
				html.fullscreen:not([chat-docking]) yt-live-chat-banner-renderer > yt-live-interactivity-component-background,
				html.fullscreen:not([chat-docking]) :is(
					yt-live-chat-viewer-engagement-message-renderer > #card,
					yt-live-chat-paid-message-renderer > #card > #header,
					yt-live-chat-paid-message-renderer > #card > #content,
					yt-live-chat-paid-sticker-renderer > #card,
					yt-live-chat-membership-item-renderer > #card > #header,
					yt-live-chat-membership-item-renderer > #card > #content,
					ytd-sponsorships-live-chat-gift-purchase-announcement-renderer > #header > #header
				):not(.yt-live-chat-banner-renderer):before {
					content: "";
					position: absolute;
					width: 100%;
					height: 100%;
					top: 0;
					left: 0;
					z-index: -1;
					opacity: [[cardOpacityDef]];
				}
			`,
			cardOpacityHover: `
				html.fullscreen:not([chat-docking]):hover yt-live-chat-banner-renderer > yt-live-interactivity-component-background,
				html.fullscreen:not([chat-docking]):hover :is(
					yt-live-chat-viewer-engagement-message-renderer > #card,
					yt-live-chat-paid-message-renderer > #card > #header,
					yt-live-chat-paid-message-renderer > #card > #content,
					yt-live-chat-paid-sticker-renderer > #card,
					yt-live-chat-membership-item-renderer > #card > #header,
					yt-live-chat-membership-item-renderer > #card > #content,
					ytd-sponsorships-live-chat-gift-purchase-announcement-renderer > #header > #header
				):not(.yt-live-chat-banner-renderer):before {
					opacity: [[cardOpacityHover]];
					transition: opacity .2s;
				}
			`
		}
	};
	static styleIds = {};
	static grabIcon = `
		<svg viewBox="0 0 24 24" focusable="false" class="style-scope yt-icon" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<style>
				yt-icon-button.yt-live-chat-header-renderer yt-icon.yt-live-chat-header-renderer {
					fill: var(--yt-spec-icon-inactive)
				}
				yt-icon-button.yt-live-chat-header-renderer:hover yt-icon.yt-live-chat-header-renderer {
					fill: var(--yt-spec-icon-active-other)
				}
			</style>
			<g class="style-scope yt-icon">
				<path d="M12.5,12.5v7.086l2-2l.707,.707L12.5,21h-1l-2.707-2.707l.707-.707l2,2V12.5h-7.086l2,2l-.707,.707L3,12.5v-1l2.707-2.707l.707,.707l-2,2H11.5v-7.086l-2,2l-.707-.707L11.5,3h1l2.707,2.707l-.707,.707l-2-2V11.5h7.086l-2-2l.707-.707L21,11.5v1l-2.707,2.707l-.707-.707l2-2H12.5Z"></path>
			</g>
		</svg>
	`;
	static basePos = {};
	static registOptions(wrapper){
		(new DOMTemplate(wrapper))
			.ins("append","caption",{
				captionInput: "toggle",
				captionDescription: this.i18n("TextOutline"),
				isNew: Options.checkUpdated(1)?" is-new":"",
				toggleOptionName: `${this.name}-opt-text-outline`,
				toggleChecked: Storage.getOption(`${this.name}-opt-text-outline`,true)?" checked":""
			},true)
			.on({q:"#ext-yc-toggle",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),e.target.getAttribute("checked") != null);
			}})
			.q(null)
			.ins("append","caption",{
				captionInput: "slider",
				captionDescription: this.i18n('FontSize'),
				sliderOptionName: `${this.name}-opt-font-size`,
				sliderValue: Storage.getOption(`${this.name}-opt-font-size`,16),
				sliderMin: 8,
				sliderMax: 32
			},true)
			.on({q:"#ext-yc-slider",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),Number(e.target.getAttribute("value")));
			}})
			.q(null)
			.ins("append","caption",{
				captionInput: "slider",
				captionDescription: this.i18n("BackgroundBlur"),
				sliderOptionName: `${this.name}-opt-background-blur`,
				sliderValue: Storage.getOption(`${this.name}-opt-background-blur`,2),
				sliderMin: 0,
				sliderMax: 10
			},true)
			.on({q:"#ext-yc-slider",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),Number(e.target.getAttribute("value")));
			}})
			.q(null)
			.ins("append","caption",{
				captionInput: "slider",
				captionDescription: this.i18n("OpacityDef"),
				sliderOptionName: `${this.name}-opt-opacity-def`,
				sliderValue: Storage.getOption(`${this.name}-opt-opacity-def`,0.6),
				sliderMin: 0,
				sliderMax: 1,
				sliderSteps: 10
			},true)
			.on({q:"#ext-yc-slider",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),Number(e.target.getAttribute("value")));
			}})
			.q(null)
			.ins("append","caption",{
				captionInput: "slider",
				captionDescription: this.i18n("OpacityHover"),
				sliderOptionName: `${this.name}-opt-opacity-hover`,
				sliderValue: Storage.getOption(`${this.name}-opt-opacity-hover`,0.9),
				sliderMin: 0,
				sliderMax: 1,
				sliderSteps: 10
			},true)
			.on({q:"#ext-yc-slider",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),Number(e.target.getAttribute("value")));
			}})
			.q(null)
			.ins("append","caption",{
				captionInput: "toggle",
				captionDescription: this.i18n("UseCard"),
				toggleOptionName: `${this.name}-opt-use-card`,
				toggleChecked: Storage.getOption(`${this.name}-opt-use-card`,true)?" checked":""
			},true)
			.on({q:"#ext-yc-toggle",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),e.target.getAttribute("checked") != null);
			}})
			.ins("append","toggleCollapse",{collapseType: "on"},true)
			.ins("append","caption",{
				captionInput: "slider",
				captionDescription: this.i18n("CardOpacityDef"),
				sliderOptionName: `${this.name}-opt-card-opacity-def`,
				sliderValue: Storage.getOption(`${this.name}-opt-card-opacity-def`,0.9),
				sliderMin: 0,
				sliderMax: 1,
				sliderSteps: 10
			},true)
			.on({q:"#ext-yc-slider",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),Number(e.target.getAttribute("value")));
			}})
			.ins("after","caption",{
				captionInput: "slider",
				captionDescription: this.i18n("CardOpacityHover"),
				sliderOptionName: `${this.name}-opt-card-opacity-hover`,
				sliderValue: Storage.getOption(`${this.name}-opt-card-opacity-hover`,0.9),
				sliderMin: 0,
				sliderMax: 1,
				sliderSteps: 10
			},true)
			.on({q:"#ext-yc-slider",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),Number(e.target.getAttribute("value")));
			}})
			.q(null)
			.ins("append","caption",{
				captionInput: "toggle",
				captionDescription: this.i18n("UseChatDocking"),
				isNew: Options.checkUpdated(2)?" is-new":"",
				toggleOptionName: `${this.name}-opt-use-chat-docking`,
				toggleChecked: Storage.getOption(`${this.name}-opt-use-chat-docking`,false)?" checked":""
			},true)
			.on({q:"#ext-yc-toggle",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),e.target.getAttribute("checked") != null);
			}})
			.ins("append","toggleCollapse",{collapseType:"on"},true)
			.ins("append","caption",{captionDescription: this.i18n("ChatDockingDescription")});
	}
	static optionsUpdated(opts){
		if(YoutubeState.isAppFrame()){
			if(opts["opt-use-chat-docking"] != undefined){
				if(opts["opt-use-chat-docking"]){
					if(YoutubeState.isFullscreen() && Storage.getStorage(`${this.name}-frame-chat-docking`,false,true)){
						this.setIframe({detail:true});
					}
				}else{
					this.setIframe({detail:false});
				}
			}
		}else if(YoutubeState.isIframeChatFrame()){
			if(opts["opt-text-outline"] != undefined){
				if(opts["opt-text-outline"]){
					this.styleIds.textOutline = this.setStyle(this.styles.child.textOutline);					
				}else{
					this.removeStyle(this.styleIds.textOutline);
				}
			}
			if(opts["opt-font-size"] != undefined){
				this.removeStyle(this.styleIds.fontSize);
				this.styleIds.fontSize = this.setStyle(this.styles.child.fontSize,{fontSize:opts["opt-font-size"]});
			}
			if(opts["opt-background-blur"] != undefined){
				this.removeStyle(this.styleIds.backgroundBlur);
				this.styleIds.backgroundBlur = this.setStyle(this.styles.child.backgroundBlur,{backgroundBlur:opts["opt-background-blur"]});
			}
			if(opts["opt-opacity-def"] != undefined){
				this.removeStyle(this.styleIds.opacityDef);
				this.styleIds.opacityDef = this.setStyle(this.styles.child.opacityDef,{opacityDef:opts["opt-opacity-def"]});
			}
			if(opts["opt-opacity-hover"] != undefined){
				this.removeStyle(this.styleIds.opacityHover);
				this.styleIds.opacityHover = this.setStyle(this.styles.child.opacityHover,{opacityHover:opts["opt-opacity-hover"]});
			}
			if(opts["opt-use-card"] != undefined){
				if(opts["opt-use-card"]){
					this.removeStyle(this.styleIds.cardOpacityDef);
					if(opts["opt-card-opacity-def"] != undefined){
						this.styleIds.cardOpacityDef = this.setStyle(this.styles.child.cardOpacityDef,{cardOpacityDef:opts["opt-card-opacity-def"]});
					}else{
						this.styleIds.cardOpacityDef = this.setStyle(this.styles.child.cardOpacityDef,{cardOpacityDef:Storage.getOption(`${this.name}-opt-card-opacity-def`,0.9)});
					}
					this.removeStyle(this.styleIds.cardOpacityHover);
					if(opts["opt-card-opacity-hover"] != undefined){
						this.styleIds.cardOpacityHover = this.setStyle(this.styles.child.cardOpacityHover,{cardOpacityHover:opts["opt-card-opacity-hover"]});
					}else{
						this.styleIds.cardOpacityHover = this.setStyle(this.styles.child.cardOpacityHover,{cardOpacityHover:Storage.getOption(`${this.name}-opt-card-opacity-hover`,0.9)});
					}
				}else{
					this.removeStyle(this.styleIds.cardOpacityDef);
					this.removeStyle(this.styleIds.cardOpacityHover);
					this.styleIds.cardOpacityDef = this.setStyle(this.styles.child.cardOpacityDef,{cardOpacityDef:1});
					this.styleIds.cardOpacityHover = this.setStyle(this.styles.child.cardOpacityHover,{cardOpacityHover:1});
				}
			}else{
				if(opts["opt-card-opacity-def"] != undefined){
					this.removeStyle(this.styleIds.cardOpacityDef);
					this.styleIds.cardOpacityDef = this.setStyle(this.styles.child.cardOpacityDef,{cardOpacityDef:opts["opt-card-opacity-def"]});
				}
				if(opts["opt-card-opacity-hover"] != undefined){
					this.removeStyle(this.styleIds.cardOpacityHover);
					this.styleIds.cardOpacityHover = this.setStyle(this.styles.child.cardOpacityHover,{cardOpacityHover:opts["opt-card-opacity-hover"]});
				}
			}
			if(opts["opt-use-chat-docking"] != undefined){
				if(opts["opt-use-chat-docking"]){
					if(YoutubeState.isFullscreen() && Storage.getStorage(`${this.name}-frame-chat-docking`,false,true)){
						document.documentElement.setAttribute("chat-docking","");
					}
				}else{
					document.documentElement.removeAttribute("chat-docking")
				}
			}
		}
	}
	static init(){
		if(YoutubeState.isAppFrame()){
			this.setStyle(this.styles.top);
			YoutubeEvent.addEventListener("ytLoad",this.resetChatDocking);

			document.addEventListener("ext-yc-iframe-set",this.setIframe);
			document.addEventListener("ext-yc-iframe-grab",this.iframeGrabed);
			document.addEventListener("ext-yc-iframe-ungrab",this.iframeUngrabed);
			document.addEventListener("ext-yc-iframe-adjust-fixed-length",this.adjustFixedLengthIframe);
		}else if(YoutubeState.isIframeChatFrame()){
			this.setStyle(this.styles.child.base);
			if(Storage.getOption(`${this.name}-opt-text-outline`,true)){
				this.styleIds.textOutline = this.setStyle(this.styles.child.textOutline);
			}
			this.styleIds.fontSize = this.setStyle(this.styles.child.fontSize,{fontSize:Storage.getOption(`${this.name}-opt-font-size`,16)});
			this.styleIds.backgroundBlur = this.setStyle(this.styles.child.backgroundBlur,{backgroundBlur:Storage.getOption(`${this.name}-opt-background-blur`,2)});
			this.styleIds.opacityDef = this.setStyle(this.styles.child.opacityDef,{opacityDef:Storage.getOption(`${this.name}-opt-opacity-def`,0.6)});
			this.styleIds.opacityHover = this.setStyle(this.styles.child.opacityHover,{opacityHover:Storage.getOption(`${this.name}-opt-opacity-hover`,0.9)});
			if(Storage.getOption(`${this.name}-opt-use-card`,true)){
				this.styleIds.cardOpacityDef = this.setStyle(this.styles.child.cardOpacityDef,{cardOpacityDef:Storage.getOption(`${this.name}-opt-card-opacity-def`,0.9)});
				this.styleIds.cardOpacityHover = this.setStyle(this.styles.child.cardOpacityHover,{cardOpacityHover:Storage.getOption(`${this.name}-opt-card-opacity-hover`,0.9)});
			}else{
				this.styleIds.cardOpacityDef = this.setStyle(this.styles.child.cardOpacityDef,{cardOpacityDef:1});
				this.styleIds.cardOpacityHover = this.setStyle(this.styles.child.cardOpacityHover,{cardOpacityHover:1});
			}

			// 移動アイコン追加
			this.moveBtn = (new DOMTemplate("#chat-messages > yt-live-chat-header-renderer > yt-icon-button#overflow:last-of-type"))
				.ins("before","ytIconButton",{id:"overflow",domTag:"yt-live-chat-header-renderer",svg:this.grabIcon})
				.q("#chat-messages > yt-live-chat-header-renderer > yt-icon-button#overflow:nth-last-of-type(2)",null).tag(this.name)
				.a("data-btn-id",0)
				.on({t:"mousedown",f:this.iframeDownEvent})
				.q();

			// リサイズ用ボタン追加
			this.resizeBtn = document.createElement("div");
			this.resizeBtn.id = "resizeButton";
			this.tagAddedDOM(this.resizeBtn);
			for(let i = 0; i < 9; i++){
				const btn = document.createElement("button");
				btn.setAttribute("data-btn-id",i+1);
				btn.setAttribute("tabindex","-1");
				this.resizeBtn.append(btn);
			}
			document.body.append(this.resizeBtn);
			this.resizeBtn.addEventListener("mousedown",this.iframeDownEvent);

			// フルスクリーン切り替え処理
			this.fullscreenHandler = YoutubeEvent.addEventListener("ytFullscreen",e=>{
				if(e.detail.args[0]){
					document.documentElement.classList.add("fullscreen");
					if(Storage.getOption(`${this.name}-opt-use-chat-docking`,false) && Storage.getStorage(`${this.name}-frame-chat-docking`,false,true)){
						document.documentElement.setAttribute("chat-docking","");
						this.iframeSet(true);
					}else{
						this.iframeSet(false);
					}
				}else{
					document.documentElement.classList.remove("fullscreen");
					document.documentElement.removeAttribute("chat-docking");
					this.iframeSet(null);
				}
			},{frame:"app"});
			this.dispatchHandler = YoutubeEvent.addEventListener("dispatch",e=>{
				if(e.detail.type == `${this.name}-chat-docking`){
					if(e.detail.data){
						document.documentElement.setAttribute("chat-docking","");
					}else{
						document.documentElement.removeAttribute("chat-docking");
					}
				}
			});
			if(YoutubeState.isFullscreen()){
				document.documentElement.classList.add("fullscreen");
				if(Storage.getOption(`${this.name}-opt-use-chat-docking`,false) && Storage.getStorage(`${this.name}-frame-chat-docking`,false,true)){
					document.documentElement.setAttribute("chat-docking","");
					this.iframeSet(true);
				}else{
					this.iframeSet(false);
				}
			}else{
				document.documentElement.classList.remove("fullscreen");
				document.documentElement.removeAttribute("chat-docking");
				this.iframeSet(null);
			}
		}
	}
	static deinit(){
		if(YoutubeState.isAppFrame()){
			document.removeEventListener("ext-yc-iframe-set",this.setIframe);
			document.removeEventListener("ext-yc-iframe-grab",this.iframeGrabed);
			document.removeEventListener("ext-yc-iframe-ungrab",this.iframeUngrabed);
			document.removeEventListener("ext-yc-iframe-move",this.moveIframe);
			YoutubeEvent.removeEventListener("ytLoad",this.resetChatDocking);
			this.setIframe({detail:null})
			document.documentElement.classList.remove("fullscreen");
		}else if(YoutubeState.isIframeChatFrame()){
			YoutubeEvent.removeEventListener("ytFullscreen",this.fullscreenHandler,{frame:"app"});
			this.fullscreenHandler = null;
			YoutubeEvent.removeEventListener("dispatch",this.dispatchHandler);
			this.dispatchHandler = null;
			this.moveBtn.removeEventListener("mousedown",this.iframeDownEvent);
			this.resizeBtn.removeEventListener("mousedown",this.iframeDownEvent);
			document.removeEventListener("mousemove",this.iframeMoveEvent);
			document.removeEventListener("mouseup",this.iframeUpEvent);
			document.removeEventListener("keydown",this.iframeAdjustFixedLength);
			document.removeEventListener("keyup",this.iframeAdjustFixedLength);
			document.documentElement.classList.remove("fullscreen");
			document.documentElement.removeAttribute("chat-docking");
		}
		this.removeAddedDOM();
	}
	static iframeSet = (e)=>{
		top.document.dispatchEvent(new CustomEvent("ext-yc-iframe-set",{detail:e}));
	}
	static iframeAdjustFixedLength = (e)=>{
		if(e.keyCode == 16){
			if(e.type == "keydown"){
				top.document.dispatchEvent(new CustomEvent("ext-yc-iframe-adjust-fixed-length",{detail:true}));
			}else if(e.type == "keyup"){
				top.document.dispatchEvent(new CustomEvent("ext-yc-iframe-adjust-fixed-length",{detail:false}));
			}
		}
	}
	static iframeDownEvent = (e)=>{
		top.document.dispatchEvent(new CustomEvent("ext-yc-iframe-grab",{detail:e}));
		document.addEventListener("mousemove",this.iframeMoveEvent);
		document.addEventListener("mouseup",this.iframeUpEvent,{once:true});
		document.addEventListener("keydown",this.iframeAdjustFixedLength);
		document.addEventListener("keyup",this.iframeAdjustFixedLength);
	}
	static iframeMoveEvent = (e)=>{
		top.document.dispatchEvent(new CustomEvent("ext-yc-iframe-move",{detail:e}));
	}
	static iframeUpEvent = (e)=>{
		document.removeEventListener("mousemove",this.iframeMoveEvent);
		document.removeEventListener("keydown",this.iframeAdjustFixedLength);
		document.removeEventListener("keyup",this.iframeAdjustFixedLength);
		top.document.dispatchEvent(new CustomEvent("ext-yc-iframe-ungrab",{detail:e}));
	}
	static setIframe = (e)=>{
		this.chatFrame = document.querySelector("ytd-live-chat-frame#chat");
		if(e.detail != null){
			if(e.detail){
				document.body.setAttribute("chat-docking","");
				this.chatFrame.style.minHeight = "";
				this.chatFrame.style.top = "0";
				this.chatFrame.style.left = "";
				this.chatFrame.style.right = "0";
				this.chatFrame.style.width = "400px"; // Storage.getStorage(`${this.name}-frame-width-docking`,400,true) + "px";
				this.chatFrame.style.height = "100vh";
			}else{
				document.body.removeAttribute("chat-docking");
				this.chatFrame.style.minHeight = "400px";
				this.chatFrame.style.top = Storage.getStorage(`${this.name}-frame-top`,0,true) + "px";
				this.chatFrame.style.left = Storage.getStorage(`${this.name}-frame-left`,0,true) + "px";
				this.chatFrame.style.right = "";
				this.chatFrame.style.width = Storage.getStorage(`${this.name}-frame-width`,400,true) + "px";
				this.chatFrame.style.height = Storage.getStorage(`${this.name}-frame-height`,600,true) + "px";
			}
		}else{
			document.body.removeAttribute("chat-docking");
			this.chatFrame.style.minHeight = "";
			this.chatFrame.style.top = "";
			this.chatFrame.style.left = "";
			this.chatFrame.style.right = "";
			this.chatFrame.style.width = "";
			this.chatFrame.style.height = "";
		}
	}
	static resetChatDocking = (e)=>{
		document.body.removeAttribute("chat-docking");
	}
	static adjustFixedLengthIframe = (e)=>{
		this.basePos.adjust = e.detail;
	}
	static iframeGrabed = (e)=>{
		this.basePos = {
			grabId: e.detail.target.closest("[data-btn-id]").getAttribute("data-btn-id"),
			adjust: false,
			offsetLeft: this.chatFrame.offsetLeft,
			offsetTop: this.chatFrame.offsetTop,
			grabX: e.detail.screenX,
			grabY: e.detail.screenY
		};
		document.body.removeAttribute("chat-docking");
		this.chatFrame.style.minHeight = "400px";
		this.chatFrame.style.width = Storage.getStorage(`${this.name}-frame-width`,400,true) + "px";
		this.chatFrame.style.height = Storage.getStorage(`${this.name}-frame-height`,600,true) + "px";
		if(Storage.getOption(`${this.name}-opt-use-chat-docking`,false)){
			Storage.setStorage(`${this.name}-frame-chat-docking`,false,true);
			YoutubeEvent.dispatchEvent("dispatch",{type:`${this.name}-chat-docking`,data: false},{frame: "iframe-chat"});
		}
		Object.assign(this.basePos,{
			offsetWidth: this.chatFrame.offsetWidth,
			offsetHeight: this.chatFrame.offsetHeight,
			offsetRight: window.screen.width - this.basePos.offsetLeft - this.chatFrame.offsetWidth,
			offsetBottom: window.screen.height - this.basePos.offsetTop - this.chatFrame.offsetHeight
		});
		document.addEventListener("ext-yc-iframe-move",this.moveIframe);
	}
	static moveIframe = (e)=>{
		const pos = this.calcFramePos(e);
		this.chatFrame.style.top = pos.top + "px";
		this.chatFrame.style.left = pos.left + "px";
		this.chatFrame.style.right = "";
		this.chatFrame.style.width = pos.width + "px";
		this.chatFrame.style.height = pos.height + "px";
	}
	static iframeUngrabed = (e)=>{
		if(Storage.getOption(`${this.name}-opt-use-chat-docking`,false) && this.basePos.offsetRight - e.detail.screenX + this.basePos.grabX < -30){
			YoutubeEvent.dispatchEvent("dispatch",{type:`${this.name}-chat-docking`,data: true},{frame: "iframe-chat"});
			this.setIframe({detail:true});
			Storage.setStorage(`${this.name}-frame-chat-docking`,true,true);
		}else{
			const pos = this.calcFramePos(e);
			Storage.setStorages({
				"FullscreenChat-frame-top": pos.top,
				"FullscreenChat-frame-left": pos.left,
				"FullscreenChat-frame-width": pos.width,
				"FullscreenChat-frame-height": pos.height
			},true);
		}
		document.removeEventListener("ext-yc-iframe-move",this.moveIframe);
	}
	static calcFramePos = (e)=>{
		let calced = {};
		const moveX = e.detail.screenX - this.basePos.grabX;
		const moveY = e.detail.screenY - this.basePos.grabY;
		if(this.basePos.grabId == "0"){
			if(this.basePos.offsetTop + moveY < 0){
				calced.top = 0;
			}else if(this.basePos.offsetBottom - moveY < 0){
				calced.top = this.basePos.offsetTop + this.basePos.offsetBottom;
			}else{
				const top = this.basePos.offsetTop + moveY;
				if(this.basePos.adjust){
					calced.top = Math.round(top / 20) * 20;
				}else{
					calced.top = top;
				}
			}
			if(this.basePos.offsetLeft + moveX < 0){
				calced.left = 0;
			}else if(this.basePos.offsetRight - moveX < 0){
				calced.left = this.basePos.offsetLeft + this.basePos.offsetRight;
			}else{
				const left = this.basePos.offsetLeft + moveX;
				if(this.basePos.adjust){
					calced.left = Math.round(left / 20) * 20;
				}else{
					calced.left = left;
				}
			}
			calced.width = this.basePos.offsetWidth;
			calced.height = this.basePos.offsetHeight;
		}
		if("123".indexOf(this.basePos.grabId) >= 0){
			if(this.basePos.offsetTop + moveY < 0){
				calced.top = 0;
				calced.height = this.basePos.offsetTop + this.basePos.offsetHeight;
			}else if(this.basePos.offsetHeight - moveY < 400){
				calced.top = this.basePos.offsetTop + this.basePos.offsetHeight - 400;
				calced.height = 400;
			}else{
				const height = this.basePos.offsetHeight - moveY;
				const top = this.basePos.offsetTop + moveY;
				if(this.basePos.adjust){
					calced.height = Math.round(height / 20) * 20;
					calced.top = top + height - calced.height
				}else{
					calced.height = height;
					calced.top = top;
				}
			}
		}
		if("789".indexOf(this.basePos.grabId) >= 0){
			if(this.basePos.offsetHeight + moveY < 400){
				calced.height = 400;
			}else if(this.basePos.offsetBottom - moveY < 0){
				calced.height = this.basePos.offsetHeight + this.basePos.offsetBottom;
			}else{
				const height = this.basePos.offsetHeight + moveY;
				if(this.basePos.adjust){
					calced.height = Math.round(height / 20) * 20;
				}else{
					calced.height = height;
				}
			}
		}
		if("28".indexOf(this.basePos.grabId) >= 0){
			calced.left = this.basePos.offsetLeft;
			calced.width = this.basePos.offsetWidth;
		}
		if("147".indexOf(this.basePos.grabId) >= 0){
			if(this.basePos.offsetLeft + moveX < 0){
				calced.left = 0;
				calced.width = this.basePos.offsetLeft + this.basePos.offsetWidth;
			}else if(this.basePos.offsetWidth - moveX < 300){
				calced.left = this.basePos.offsetLeft + this.basePos.offsetWidth - 300;
				calced.width = 300;
			}else{
				const width = this.basePos.offsetWidth - moveX;
				const left = this.basePos.offsetLeft + moveX;
				if(this.basePos.adjust){
					calced.width = Math.round(width / 20) * 20;
					calced.left = left + width - calced.width;
				}else{
					calced.width = width;
					calced.left = left;
				}
			}
		}
		if("369".indexOf(this.basePos.grabId) >= 0){
			if(this.basePos.offsetWidth + moveX < 300){
				calced.width = 300;
			}else if(this.basePos.offsetRight - moveX < 0){
				calced.width = this.basePos.offsetWidth + this.basePos.offsetRight;
			}else{
				const width = this.basePos.offsetWidth + moveX;
				if(this.basePos.adjust){
					calced.width = Math.round(width / 20) * 20;
				}else{
					calced.width = width;
				}
			}
		}
		if("46".indexOf(this.basePos.grabId) >= 0){
			calced.top = this.basePos.offsetTop;
			calced.height = this.basePos.offsetHeight;
		}
		return calced;
	}
}
// Youtube ChatTickerScroll
class ChatTickerScroll extends Ext {
	static name = "ChatTickerScroll";
	static description = this.i18n("Description");
	static optionsV = 0;
	static style = `
		#ticker :is(#left-arrow-container, #right-arrow-container) {
			display: none;
		}
	`;
	static ticker;
	static buttons = {
		true: document.querySelector("#ticker #left-arrow-container yt-icon"),
		false: document.querySelector("#ticker #right-arrow-container yt-icon")
	};
	static timeoutHandlers = {
		true: null,
		false: null
	};
	static registOptions(wrapper){
		(new DOMTemplate(wrapper))
			.ins("append","caption",{
				captionInput: "toggle",
				captionDescription: this.i18n("ButtonHide"),
				toggleOptionName: `${this.name}-opt-button-hide`,
				toggleChecked: (Storage.getOption(`${this.name}-opt-button-hide`,true)?" checked":"")
			},true)
			.on({q:"#ext-yc-toggle",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),e.target.getAttribute("checked") != null);
			}})
	}
	static optionsUpdated(opts){
		if(opts["opt-button-hide"]){
			this.setStyle(this.style);
		}else{
			this.removeStyle(null);
		}
	}
	static init(){
		if(YoutubeState.isChatFrame()){
			YoutubeEvent.addEventListener("load",()=>{
				if(Storage.getOption(`${this.name}-opt-button-hide`,true)){
					this.setStyle(this.style);
				}
				this.ticker = document.querySelector("#ticker yt-live-chat-ticker-renderer");
				this.ticker.addEventListener("wheel",this.scrollTicker);
			});
		}
	}
	static deinit(){
		if(YoutubeState.isChatFrame()){
			this.removeStyle(null);
			this.ticker.removeEventListener("wheel",this.scrollTicker);
		}
	}
	static scrollTicker = (e)=>{
		const left = e.wheelDelta >= 0;
		if(this.timeoutHandlers[left]){
			clearTimeout(this.timeoutHandlers[left]);
		}else{
			if(this.timeoutHandlers[!left]){
				clearTimeout(this.timeoutHandlers[!left]);
				this.timeoutHandlers[!left] = null;
				this.buttons[!left].dispatchEvent(new Event("up"));
			}
			this.buttons[left].dispatchEvent(new Event("down"));
		}
		this.timeoutHandlers[left] = setTimeout(()=>{
			this.timeoutHandlers[left] = null;
			this.buttons[left].dispatchEvent(new Event("up"));
		},500);
	}
}

if(YoutubeState.parentsFrameIsYT() != false){
	init();
}