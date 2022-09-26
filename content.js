const extensions = {};
function init(){
	const exts = [
		SpannerPick,
		FullscreenChat,
		ChatTickerScroll
	];
	for(let ex of exts){
		extensions[ex.name] = ex;
	}
	YoutubeEvent.addEventListener("storageLoad",()=>{
		YoutubeEvent.dispatchEvent("allLoad");
	});
}

// Youtube spanner pick
class SpannerPick extends Ext {
	static name = "SpannerPick";
	static description = chrome.i18n.getMessage("SpannerPickDescription");
	static style = `
		#fixedCommentList {
			left: 0;
			right: 0;
			bottom: 0;
			position: absolute;
			max-height: 150px;
			overflow: scroll;
			border-top: 1px solid rgba(255,255,255,0.1);
		}
		#fixedCommentList::-webkit-scrollbar {
			display: none;
		}
	`;
	static init(){
		if(YoutubeState.isChildFrame()){
			YoutubeEvent.addEventListener("connected",()=>{
				this.setStyle(this.style);
				const items = document.querySelector("#items.yt-live-chat-item-list-renderer");
				const fixedCommentList = document.createElement("div");
				this.tagAddedDOM(fixedCommentList);
				items.style.marginBottom = "0px";
				items.after(fixedCommentList);
				fixedCommentList.id = "fixedCommentList";
				this.fullscreenHandler = YoutubeEvent.addEventListener("ytFullscreen",()=>{
					items.style.marginBottom = fixedCommentList.clientHeight + "px";
				},{pair:true});
				this.observerCallback([{addedNodes:Array(...items.children),removedNodes:[]}]);
				if(!this.observer){
					this.observer = new MutationObserver(this.observerCallback);
				}
				this.observer.observe(items,{childList:true});
			});
		}
	}
	static deinit(){
		if(YoutubeState.isChildFrame()){
			const items = document.querySelector("#items.yt-live-chat-item-list-renderer");
			const fixedCommentList = document.querySelector("div#fixedCommentList");
			items.style.marginBottom = "";
			this.observer.disconnect();
			YoutubeEvent.removeEventListener("ytFullscreen", this.fullscreenHandler,{pair:true});
			this.fullscreenHandler = null;
			Array.from(fixedCommentList.childNodes).forEach(node=>{
				const replacement = items.querySelector(`*[data-comment-id="${node.id}"]`);
				replacement.after(node);
				replacement.remove();
			});
			this.removeAddedDOM();
		}
	}
	static observerCallback(mutationList){
		const items = document.querySelector("#items.yt-live-chat-item-list-renderer")
		const fixedCommentList = document.querySelector("#fixedCommentList");
		const authorType = ["moderator","owner"];
		mutationList.forEach(mutation=>{
			if(mutation.addedNodes.length){
				mutation.addedNodes.forEach(node=>{
					if(
						authorType.includes(node.getAttribute("author-type")) ||
						node.querySelector("div#content > yt-live-chat-author-chip[is-highlighted]")
					){
						const replacement = document.createElement("yt-live-chat-text-message-renderer");
						replacement.classList.add("fixedComment");
						replacement.height = node.clientHeight;
						replacement.dataset.commentId = node.id;
						node.after(replacement);
						fixedCommentList.appendChild(node);
						replacement.querySelector("#content > #message").innerText = chrome.i18n.getMessage("SpannerPickReplaceText");
						replacement.querySelector("#menu").setAttribute("hidden","");
						items.style.marginBottom = fixedCommentList.clientHeight + "px";
						fixedCommentList.scrollTo({"top":fixedCommentList.scrollHeight, "behavior":"smooth"});
					}
				});
			}else if(mutation.removedNodes.length){
				mutation.removedNodes.forEach(node=>{
					if(Array.from(node.classList).includes("fixedComment")){
						fixedCommentList.querySelector(`*[id="${node.dataset.commentId}"]`).remove();
						items.style.marginBottom = fixedCommentList.clientHeight + "px";
					}
				})
			}
		})
	}

}
// Youtube fullscreenChat
class FullscreenChat extends Ext {
	static name = "FullscreenChat";
	static description = chrome.i18n.getMessage("FullscreenChatDescription");
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
		html.fullscreen yt-live-chat-pinned-message-renderer > #message > * {
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
			yt-live-chat-participant-list-renderer > #header,
			#ext-yc-options-wrapper > #header
		):not(.yt-live-chat-banner-renderer) {
			position: relative;
			background: none;
			overflow: hidden;
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
			yt-live-chat-participant-list-renderer > #header,
			#ext-yc-options-wrapper > #header
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
			yt-live-chat-membership-item-renderer > #card > #content
		):before {
			opacity: 0.7;
		}
		html.fullscreen:hover yt-live-chat-banner-renderer > yt-live-interactivity-component-background,
		html.fullscreen:hover :is(
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
			yt-live-chat-participant-list-renderer > #header,
			#ext-yc-options-wrapper > #header
		):before {
			opacity: 0.9;
			transition: opacity .2s;
		}

		html.fullscreen yt-live-chat-renderer:before {
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
		html.fullscreen yt-live-chat-participant-list-renderer > #header:before {
			background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
		}
		html.fullscreen #ext-yc-options-wrapper > #header:before {
			background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
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
		if(YoutubeState.isChildFrame()){
			YoutubeEvent.addEventListener("connected",()=>{
				this.setStyle(this.styles.child);

				// 移動アイコン追加
				this.grabBtnOut = document.createElement("yt-icon-button");
				this.tagAddedDOM(this.grabBtnOut);
				this.grabBtnOut.id = "overflow";
				this.grabBtnOut.classList.add("style-scope","yt-live-chat-header-renderer");
				document.querySelector("#chat-messages > yt-live-chat-header-renderer > yt-icon-button#overflow:last-child").before(this.grabBtnOut);
				const grabBtnIn = document.createElement("yt-icon");
				grabBtnIn.classList.add("style-scope","yt-live-chat-header-renderer");
				this.grabBtnOut.querySelector("#button").appendChild(grabBtnIn);
				grabBtnIn.insertAdjacentHTML("afterbegin",this.grabIcon);

				this.fullscreenHandler = YoutubeEvent.addEventListener("ytFullscreen",e=>{
					if(e.detail.args[0]){
						document.documentElement.classList.add("fullscreen");
					}else{
						document.documentElement.classList.remove("fullscreen");
					}
				},{pair:true});
				if(YoutubeState.isFullscreen()){
					document.documentElement.classList.add("fullscreen");
				}else{
					document.documentElement.classList.remove("fullscreen");
				}
				this.grabBtnOut.addEventListener("mousedown",this.iframeDownEvent);
			});
		}else{
			this.setStyle(this.styles.top);
			
			YoutubeEvent.addEventListener("connected",()=>{
				const chatFrame = document.querySelector("ytd-live-chat-frame#chat");
				chatFrame.style.top = Storage.getOption("FullscreenChat-frame-top","0");
				chatFrame.style.left = Storage.getOption("FullscreenChat-frame-left","0");
				chatFrame.style.width = Storage.getOption("FullscreenChat-frame-width","400px");
			},{overlapDeny:"FullscreenChat"});

			document.addEventListener("ext-yc-iframe-grab",this.iframeGrabed);
			document.addEventListener("ext-yc-iframe-ungrab",this.iframeUngrabed);
		}
	}
	static deinit(){
		if(YoutubeState.isChildFrame()){
			YoutubeEvent.removeEventListener("ytFullscreen",this.fullscreenHandler,{pair:true});
			this.fullscreenHandler = null;
			this.grabBtnOut.removeEventListener("mousedown",this.iframeDownEvent);
			document.removeEventListener("mousemove",this.iframeMoveEvent);
			document.removeEventListener("mouseup",this.iframeUpEvent);
		}else{
			document.removeEventListener("ext-yc-iframe-grab",this.iframeGrabed);
			document.removeEventListener("ext-yc-iframe-ungrab",this.iframeUngrabed);
			document.removeEventListener("ext-yc-iframe-move",this.moveIframe);
			const chatFrame = document.querySelector("ytd-live-chat-frame#chat");
			chatFrame.style.top = "";
			chatFrame.style.left = "";
			chatFrame.style.width = "";
			document.documentElement.classList.remove("fullscreen");
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
		Storage.saveOptions({
			"FullscreenChat-frame-top": pos.top,
			"FullscreenChat-frame-left": pos.left,
			"FullscreenChat-frame-width": pos.width
		});
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
// Youtube chatTickerScroll
class ChatTickerScroll extends Ext {
	static name = "ChatTickerScroll";
	static description = chrome.i18n.getMessage("ChatTickerScrollDescription");
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
		if(YoutubeState.isChildFrame()){
			YoutubeEvent.addEventListener("connected",()=>{
				this.ticker.addEventListener("wheel",this.scrollTicker);
			});
		}
	}
	static deinit(){
		if(YoutubeState.isChildFrame()){
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

init();