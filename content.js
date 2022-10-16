const extensions = {};
function init(){
	const exts = [
		CommentFixer,
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

// Youtube CommentFixer
class CommentFixer extends Ext {
	static name = "CommentFixer";
	static description = this.i18n("Description");
	static style = `
		yt-live-chat-item-list-renderer {
			display: flex;
			flex-direction: column;
		}
		yt-live-chat-item-list-renderer #contents.yt-live-chat-item-list-renderer {
			position: relative;
			flex: 1;
			overflow: hidden;
		}
		yt-live-chat-item-list-renderer #contents.yt-live-chat-item-list-renderer[data-ext-yc="${this.name}"] {
			display: unset;
			flex: unset;
			max-height: 30%;
			border-top: 1px solid rgba(255,255,255,0.1);
		}
		yt-live-chat-item-list-renderer #contents[data-ext-yc="${this.name}"] #item-scroller {
			max-height: 100%;
		}
		yt-live-chat-item-list-renderer #contents[data-ext-yc="${this.name}"] #item-offset #items {
			position: unset;
			padding: unset;
		}
	`;
	static fixedContainer = `
		<div id="contents" class="style-scope yt-live-chat-item-list-renderer" data-ext-yc="${this.name}">
			<div id="item-scroller" class="style-scope yt-live-chat-item-list-renderer animated">
				<div id="item-offset" class="style-scope yt-live-chat-item-list-renderer">
					<div id="items" class="style-scope yt-live-chat-item-list-renderer"></div>
				</div>
			</div>
		</div>
	`;
	static baseItems;
	static addedItems;
	static opts = {};
	static registOptions(wrapper){
		(new DOMTemplate(wrapper))
			.ins("append","caption",{
				captionInput: "toggle",
				captionDescription: this.i18n("Owner"),
				toggleOptionName: `${this.name}-opt-owner`,
				toggleChecked: (Storage.getOption(`${this.name}-opt-owner`,false)?" checked":"")
			},true)
			.on({q:"#ext-yc-toggle",t:"click",f:Options.toggle})
			.q(null)
			.ins("append","caption",{
				captionInput: "toggle",
				captionDescription: this.i18n("Verified"),
				toggleOptionName: `${this.name}-opt-verified`,
				toggleChecked: (Storage.getOption(`${this.name}-opt-verified`,false)?" checked":"")
			},true)
			.on({q:"#ext-yc-toggle",t:"click",f:Options.toggle})
			.q(null)
			.ins("append","caption",{
				captionInput: "toggle",
				captionDescription: this.i18n("Moderator"),
				toggleOptionName: `${this.name}-opt-moderator`,
				toggleChecked: (Storage.getOption(`${this.name}-opt-moderator`,false)?" checked":"")
			},true)
			.on({q:"#ext-yc-toggle",t:"click",f:Options.toggle});
	}
	static optionsUpdated(opts){
		if(YoutubeState.isChatFrame()){
			Object.assign(this.opts,opts);
			this.observer.disconnect();
			Array.from(this.addedItems.childNodes).forEach(node=>{
				const replacement = this.baseItems.querySelector(`*[data-comment-id="${node.id}"]`);
				replacement.after(node);
				replacement.remove();
			});
			this.observerCallback([{addedNodes:Array(...this.baseItems.children),removedNodes:[]}]);
			this.observer.observe(this.baseItems,{childList:true});
		}
	}
	static init(){
		if(YoutubeState.isChatFrame()){
			YoutubeEvent.addEventListener("load",()=>{
				this.setStyle(this.style);
				this.opts["opt-owner"] = Storage.getOption(`${this.name}-opt-owner`,true);
				this.opts["opt-verified"] = Storage.getOption(`${this.name}-opt-verified`,true);
				this.opts["opt-moderator"] = Storage.getOption(`${this.name}-opt-moderator`,true);
				this.baseItems = document.querySelector("#items.yt-live-chat-item-list-renderer");
				const wrapper = document.querySelector("yt-live-chat-item-list-renderer");
				wrapper.insertAdjacentHTML("beforeend",this.fixedContainer);
				this.addedItems = wrapper.querySelector(`[data-ext-yc="${this.name}"] #items`);
				this.observerCallback([{addedNodes:Array(...this.baseItems.children),removedNodes:[]}]);
				if(!this.observer){
					this.observer = new MutationObserver(this.observerCallback);
				}
				this.observer.observe(this.baseItems,{childList:true});
			});
		}
	}
	static deinit(){
		if(YoutubeState.isChatFrame()){
			this.observer.disconnect();
			Array.from(this.addedItems.childNodes).forEach(node=>{
				const replacement = this.baseItems.querySelector(`*[data-comment-id="${node.id}"]`);
				replacement.after(node);
				replacement.remove();
			});
			this.removeAddedDOM();
		}
	}
	static observerCallback = (mutationList)=>{
		mutationList.forEach(mutation=>{
			if(mutation.addedNodes.length){
				mutation.addedNodes.forEach(node=>{
					if(
						this.opts["opt-owner"] && node.getAttribute("author-type") == "owner" ||
						this.opts["opt-verified"] && node.querySelector('yt-live-chat-author-badge-renderer[type="verified"]') ||
						this.opts["opt-moderator"] && node.getAttribute("author-type") == "moderator"
					){
						const replacement = document.createElement("yt-live-chat-text-message-renderer");
						replacement.classList.add("fixedComment");
						replacement.dataset.commentId = node.id;
						node.after(replacement);
						replacement.querySelector("#content > #message").innerText = this.i18n("ReplaceText");
						replacement.querySelector("#menu").setAttribute("hidden","");
						const addedScroller = this.addedItems.closest("#item-scroller");
						const scrolling = addedScroller.scrollTop < addedScroller.scrollHeight - addedScroller.clientHeight;
						this.addedItems.append(node);
						const baseScroller = this.baseItems.closest("#item-scroller");
						baseScroller.scrollTo({"top":baseScroller.scrollHeight-baseScroller.clientHeight});
						if(!scrolling){
							addedScroller.scrollTo({"top":addedScroller.scrollHeight-addedScroller.clientHeight,"behavior":"smooth"});
						}
					}
				});
			}else if(mutation.removedNodes.length){
				mutation.removedNodes.forEach(node=>{
					if(Array.from(node.classList).includes("fixedComment")){
						this.addedItems.querySelector(`*[id="${node.dataset.commentId}"]`).remove();
					}
				})
			}
		})
	}

}
// Youtube FullscreenChat
class FullscreenChat extends Ext {
	static name = "FullscreenChat";
	static description = this.i18n("Description");
	static styles = {
		top: `
			body:not(.no-scroll) ytd-live-chat-frame#chat {
				top: unset!important;
				left: unset!important;
				width: unset!important;
			}
			
			body.no-scroll ytd-live-chat-frame#chat {
				margin: 0;
				position: absolute;
				border: none;
				border-radius: 6px;
				overflow: hidden;
			}
			
			body.no-scroll ytd-live-chat-frame#chat :not(iframe#chatframe) {
				display: none;
			}
		`,
		child: `
		html.fullscreen yt-live-chat-pinned-message-renderer > #message {
			z-index: 0;
		}
		html.fullscreen yt-live-chat-toast-renderer {
			z-index: -1;
		}
		html.fullscreen :is(
			yt-live-chat-banner-manager,
			yt-live-chat-text-message-renderer > #menu
		) {
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
			#ext-yc-card
		):not(.yt-live-chat-banner-renderer) {
			position: relative;
			background: none;
			overflow: hidden;
		}

		html.fullscreen :is(
			yt-live-chat-renderer > iron-pages > *:not(yt-live-chat-ninja-message-renderer),
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
			#ext-yc-card
		):not(.yt-live-chat-banner-renderer):before {
			content: "";
			position: absolute;
			width: 100%;
			height: 100%;
			top: 0;
			left: 0;
			z-index: -1;
			opacity: 0.6;
		}
		html.fullscreen yt-live-chat-banner-renderer > yt-live-interactivity-component-background,
		html.fullscreen :is(
			yt-live-chat-viewer-engagement-message-renderer > #card,
			yt-live-chat-paid-message-renderer > #card > #header,
			yt-live-chat-paid-message-renderer > #card > #content,
			yt-live-chat-paid-sticker-renderer > #card,
			yt-live-chat-membership-item-renderer > #card > #header,
			yt-live-chat-membership-item-renderer > #card > #content,
			ytd-sponsorships-live-chat-gift-purchase-announcement-renderer > #header > #header
		):before {
			opacity: 0.7;
		}
		html.fullscreen:hover yt-live-chat-banner-renderer > yt-live-interactivity-component-background,
		html.fullscreen:hover :is(
			yt-live-chat-renderer > iron-pages > *:not(yt-live-chat-ninja-message-renderer),
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
			#ext-yc-card
		):before {
			opacity: 0.9;
			transition: opacity .2s;
		}

		html.fullscreen yt-live-chat-renderer > iron-pages > *:not(yt-live-chat-ninja-message-renderer):before {
			background-color: var(--yt-live-chat-background-color);
		}
		html.fullscreen yt-live-chat-header-renderer:before {
			background-color: var(--yt-live-chat-header-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
		}
		html.fullscreen yt-live-chat-message-input-renderer:before {
			background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
		}
		html.fullscreen yt-live-chat-text-message-renderer[author-is-owner]:before {
			background-color: var(--yt-live-chat-message-highlight-background-color);
		}
		html.fullscreen yt-live-chat-ticker-renderer:before {
			background-color: var(--yt-live-chat-header-background-color);
		}
		html.fullscreen yt-live-chat-toast-renderer[is-showing-message]:before {
			background-color: var(--yt-live-chat-toast-background-color);
		}
		html.fullscreen yt-live-chat-restricted-participation-renderer > #container:before {
			background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
		}
		html.fullscreen yt-live-chat-viewer-engagement-message-renderer > #card:before {
			background-color: var(--yt-live-chat-vem-background-color);
		}
		html.fullscreen yt-live-chat-paid-message-renderer > #card > #header:before {
			background-color: var(--yt-live-chat-paid-message-header-background-color,#125aac);
		}
		html.fullscreen yt-live-chat-paid-message-renderer > #card > #content:before {
			background-color: var(--yt-live-chat-paid-message-background-color,#1565c0);
		}
		html.fullscreen yt-live-chat-paid-sticker-renderer > #card:before {
			background-color: var(--yt-live-chat-paid-sticker-background-color);
		}
		html.fullscreen yt-live-chat-membership-item-renderer > #card > #header:before {
			background-color: var(--yt-live-chat-sponsor-header-color);
		}
		html.fullscreen yt-live-chat-membership-item-renderer[show-only-header] > #card > #header:before {
			background-color: var(--yt-live-chat-sponsor-color);
		}
		html.fullscreen yt-live-chat-membership-item-renderer > #card > #content:before {
			background-color: var(--yt-live-chat-sponsor-color);
		}
		html.fullscreen ytd-sponsorships-live-chat-gift-purchase-announcement-renderer > #header > #header:before {
			background-color: var(--yt-live-chat-sponsor-color);
		}
		html.fullscreen yt-live-chat-participant-list-renderer > #header:before {
			background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
		}
		html.fullscreen #ext-yc-options-wrapper > #header:before {
			background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
		}
		html.fullscreen #ext-yc-card:before {
			background-color: var(--yt-live-chat-vem-background-color);
		}
		

		html.fullscreen :is(
			#chat,
			yt-live-chat-participant-list-renderer #participants,
			#ext-yc-options
		) {
			margin-right: 7px;
		}
		
		html.fullscreen :is(
			#chat #item-scroller,
			#participants,
			#ext-yc-options
		) {
			--scrollbar-width: 7px;
			padding-right: 7px;
		}
		html.fullscreen :is(
			#chat #item-scroller,
			#participants,
			#ext-yc-options
		):hover {
			overflow-y: scroll;
			padding-right: 0;
		}
		html.fullscreen :is(
			#chat #item-scroller,
			#participants,
			#ext-yc-options
		)::-webkit-scrollbar {
			width: 0;
		}
		html.fullscreen :is(
			#chat #item-scroller,
			#participants,
			#ext-yc-options
		):hover::-webkit-scrollbar {
			width: var(--scrollbar-width);
		}
		html.fullscreen :is(
			#chat #item-scroller,
			#participants,
			#ext-yc-options
		)::-webkit-scrollbar-track {
			background-color: transparent;
		}
		html.fullscreen :is(
			#chat #item-scroller,
			#participants,
			#ext-yc-options
		)::-webkit-scrollbar-thumb {
			border-radius: 10px;
			border-color: transparent;
			background-color: rgba(240, 240, 240, 0.3);
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
		
		
		html.fullscreen yt-live-chat-text-message-renderer {
			font-size: 16px;
		}
		html.fullscreen #author-name.yt-live-chat-author-chip {
			font-weight: 600;
		}
		
		html.nodisplay yt-live-chat-renderer {		// TODO
			// background: transparent;
		}
		html.fullscreen yt-live-chat-ninja-message-renderer {
			display: none;
		}
		`
	};
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
	static init(){
		if(YoutubeState.isAppFrame()){
			this.setStyle(this.styles.top);
			
			YoutubeEvent.addEventListener("connected",(e)=>{
				if(!e.detail.new && e.detail.frames.indexOf("iframe-chat") > 0 || e.detail.new == "iframe-chat"){
					const chatFrame = document.querySelector("ytd-live-chat-frame#chat");
					chatFrame.style.top = Storage.getOption("FullscreenChat-frame-top","0");
					chatFrame.style.left = Storage.getOption("FullscreenChat-frame-left","0");
					chatFrame.style.width = Storage.getOption("FullscreenChat-frame-width","400px");	
				}
			},{overlapDeny:"FullscreenChat"});

			document.addEventListener("ext-yc-iframe-grab",this.iframeGrabed);
			document.addEventListener("ext-yc-iframe-ungrab",this.iframeUngrabed);
		}else if(YoutubeState.isIframeChatFrame()){
			this.setStyle(this.styles.child);
			
			// 移動アイコン追加
			this.moveBtn = (new DOMTemplate("#chat-messages > yt-live-chat-header-renderer > yt-icon-button#overflow:last-child"))
				.ins("before","ytIconButton",{svg:this.grabIcon})
				.q("#chat-messages > yt-live-chat-header-renderer > yt-icon-button#overflow:nth-last-child(2)",null).tag(this.name)
				.on({t:"mousedown",f:this.iframeDownEvent})
				.q();

			this.fullscreenHandler = YoutubeEvent.addEventListener("ytFullscreen",e=>{
				if(e.detail.args[0]){
					document.documentElement.classList.add("fullscreen");
				}else{
					document.documentElement.classList.remove("fullscreen");
				}
			},{frame:"app"});
			if(YoutubeState.isFullscreen()){
				document.documentElement.classList.add("fullscreen");
			}else{
				document.documentElement.classList.remove("fullscreen");
			}
		}
	}
	static deinit(){
		if(YoutubeState.isAppFrame()){
			document.removeEventListener("ext-yc-iframe-grab",this.iframeGrabed);
			document.removeEventListener("ext-yc-iframe-ungrab",this.iframeUngrabed);
			document.removeEventListener("ext-yc-iframe-move",this.moveIframe);
			const chatFrame = document.querySelector("ytd-live-chat-frame#chat");
			chatFrame.style.top = "";
			chatFrame.style.left = "";
			chatFrame.style.width = "";
			document.documentElement.classList.remove("fullscreen");
		}else if(YoutubeState.isIframeChatFrame()){
			YoutubeEvent.removeEventListener("ytFullscreen",this.fullscreenHandler,{frame:"app"});
			this.fullscreenHandler = null;
			this.moveBtn.removeEventListener("mousedown",this.iframeDownEvent);
			document.removeEventListener("mousemove",this.iframeMoveEvent);
			document.removeEventListener("mouseup",this.iframeUpEvent);
		}
		this.removeAddedDOM();
	}
	static iframeDownEvent = (e)=>{
		top.document.dispatchEvent(new CustomEvent("ext-yc-iframe-grab",{detail:e}));
		document.addEventListener("mousemove",this.iframeMoveEvent);
		document.addEventListener("mouseup",this.iframeUpEvent,{once:true});
	}
	static iframeMoveEvent = (e)=>{
		top.document.dispatchEvent(new CustomEvent("ext-yc-iframe-move",{detail:e}));
	}
	static iframeUpEvent = (e)=>{
		document.removeEventListener("mousemove",this.iframeMoveEvent);
		top.document.dispatchEvent(new CustomEvent("ext-yc-iframe-ungrab",{detail:e}));
	}
	static iframeGrabed = (e)=>{
		const chatFrame = document.querySelector("ytd-live-chat-frame#chat");
		this.basePos = {
			offsetLeft: chatFrame.offsetLeft,
			offsetTop: chatFrame.offsetTop,
			offsetRight: window.screen.width - chatFrame.offsetLeft - chatFrame.offsetWidth,
			offsetBottom: window.screen.height - chatFrame.offsetTop - chatFrame.offsetHeight,
			grabX: e.detail.screenX,
			grabY: e.detail.screenY
		};
		document.addEventListener("ext-yc-iframe-move",this.moveIframe);
	}
	static iframeUngrabed = (e)=>{
		const pos = this.calcFramePos(e);
		Storage.setOptions({
			"FullscreenChat-frame-top": pos.top,
			"FullscreenChat-frame-left": pos.left,
			"FullscreenChat-frame-width": pos.width
		},true);
		document.removeEventListener("ext-yc-iframe-move",this.moveIframe);
	}
	static moveIframe = (e)=>{
		const pos = this.calcFramePos(e);
		const chatFrame = document.querySelector("ytd-live-chat-frame#chat");
		chatFrame.style.top = pos.top;
		chatFrame.style.left = pos.left;
		chatFrame.style.width = pos.width;
	}
	static calcFramePos = (e)=>{
		let calced = {};
		const moveX = e.detail.screenX - this.basePos.grabX;
		const moveY = e.detail.screenY - this.basePos.grabY;
		if(this.basePos.offsetTop + moveY < 0){
			calced.top = "0px";
		}else if(this.basePos.offsetBottom - moveY < 0){
			calced.top = this.basePos.offsetTop + this.basePos.offsetBottom + "px";
		}else{
			calced.top = this.basePos.offsetTop + moveY + "px";
		}
		if(this.basePos.offsetLeft + moveX < 0){
			calced.left = "0px";
		}else if(this.basePos.offsetRight - moveX < 0){
			calced.left = this.basePos.offsetLeft + this.basePos.offsetRight + "px";
		}else{
			calced.left = this.basePos.offsetLeft + moveX + "px";
		}
		calced.width = "400px";
		return calced;
	}
}
// Youtube ChatTickerScroll
class ChatTickerScroll extends Ext {
	static name = "ChatTickerScroll";
	static description = this.i18n("Description");
	static ticker = document.querySelector("#ticker yt-live-chat-ticker-renderer");
	static buttons = {
		true: document.querySelector("#ticker #left-arrow-container yt-icon"),
		false: document.querySelector("#ticker #right-arrow-container yt-icon")
	};
	static timeoutHandlers = {
		true: null,
		false: null
	};
	static init(){
		if(YoutubeState.isChatFrame()){
			YoutubeEvent.addEventListener("load",()=>{
				this.ticker.addEventListener("wheel",this.scrollTicker);
			});
		}
	}
	static deinit(){
		if(YoutubeState.isChatFrame()){
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