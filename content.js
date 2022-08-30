class YoutubeInit {
	static init(){
		const extensions = [
			SpannerPick,
			FullscreenChat
		];
		
		chrome.storage.sync.get(null,stg=>{
			extensions.forEach(e=>{
				if(e.initOpt){
					e.initOpt(stg);
				}
			});
		});
		extensions.forEach(e=>{
			if(e.init){
				e.init();
			}
		});
		YoutubeEvent.dispatchEvent("allLoad");
	}
}

// Youtube spanner pick
class SpannerPick extends Ext {
	static name = "SpannerPick";
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
				YoutubeEvent.addEventListener("ytFullscreen",e=>{
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
			Array.from(fixedCommentList.childNodes).forEach(node=>{
				const replacement = items.querySelector('*[data-comment-id="'+node.id+'"]');
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
						// replacement.style.backgroundColor = "var(--yt-live-chat-message-highlight-background-color)";
						// replacement.style.visibility = "hidden";
						replacement.dataset.commentId = node.id;
						node.after(replacement);
						fixedCommentList.appendChild(node);
						replacement.querySelector("#content > #message").innerText = "固定化されたコメントです"
						items.style.marginBottom = fixedCommentList.clientHeight + "px";
						fixedCommentList.scrollTo({"top":fixedCommentList.scrollHeight, "behavior":"smooth"});
					}
				});
			}else if(mutation.removedNodes.length){
				mutation.removedNodes.forEach(node=>{
					if(Array.from(node.classList).includes("fixedComment")){
						fixedCommentList.querySelector('*[id="'+node.dataset.commentId+'"]').remove();
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
	static alpha1 = 0.6;
	static alpha2 = 0.9;
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
		html.fullscreen:not([dark]) {
			--yt-live-chat-background-color: rgba(249,249,249,${this.alpha1})!important;
			--yt-live-chat-header-background-color: rgba(255,255,255,${this.alpha1})!important;
			--yt-live-chat-action-panel-background-color: rgba(255,255,255,${this.alpha1})!important;
			--yt-spec-brand-background-primary: rgba(255,255,255,${this.alpha1})!important;
			--yt-live-chat-vem-background-color: rgba(252,252,252,${this.alpha1})!important;
		}
		html.fullscreen:not([dark]):hover {
			--yt-live-chat-background-color: rgba(249,249,249,${this.alpha2})!important;
			--yt-live-chat-header-background-color: rgba(255,255,255,${this.alpha2})!important;
			--yt-live-chat-action-panel-background-color: rgba(255,255,255,${this.alpha2})!important;
			--yt-spec-brand-background-primary: rgba(255,255,255,${this.alpha2})!important;
			--yt-live-chat-vem-background-color: rgba(252,252,252,${this.alpha2})!important;
		}
		html.fullscreen[dark] {
			--yt-live-chat-background-color: rgba(25,25,25,${this.alpha1})!important;
			--yt-live-chat-header-background-color: rgba(40,40,40,${this.alpha1})!important;
			--yt-live-chat-action-panel-background-color: rgba(40,40,40,${this.alpha1})!important;
			--yt-spec-brand-background-primary: rgba(40,40,40,${this.alpha1})!important;
			--yt-live-chat-vem-background-color: rgba(62,62,62,${this.alpha1})!important;
		}
		html.fullscreen[dark]:hover {
			--yt-live-chat-background-color: rgba(25,25,25,${this.alpha2})!important;
			--yt-live-chat-header-background-color: rgba(40,40,40,${this.alpha2})!important;
			--yt-live-chat-action-panel-background-color: rgba(40,40,40,${this.alpha2})!important;
			--yt-spec-brand-background-primary: rgba(40,40,40,${this.alpha2})!important;
			--yt-live-chat-vem-background-color: rgba(62,62,62,${this.alpha2})!important;
		}
		
		html.fullscreen #chat {
			padding-right: 10px;
		}
		
		html.fullscreen #item-scroller {
			--scrollbar-width: 5px;
		}
		html.fullscreen #item-scroller::-webkit-scrollbar {
			width: var(--scrollbar-width);
		}
		html.fullscreen #item-scroller::-webkit-scrollbar-track {
			background-color: transparent;
		}
		html.fullscreen #item-scroller::-webkit-scrollbar-thumb {
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
					stroke: var(--yt-spec-icon-inactive)
				}
				yt-icon-button.yt-live-chat-header-renderer:hover yt-icon.yt-live-chat-header-renderer {
					stroke: var(--yt-spec-icon-active-other)
				}
			</style>
			<g class="style-scope yt-icon">
				<line x1="3" y1="12" x2="21" y2="12" stroke-linecap="round" class="style-scope yt-icon"></line>
				<line x1="12" y1="3" x2="12" y2="21" stroke-linecap="round" class="style-scope yt-icon"></line>
				<line x1="3" y1="12" x2="12" y2="3" stroke-linecap="round" stroke-dasharray="4 4" class="style-scope yt-icon"></line>
				<line x1="12" y1="3" x2="21" y2="12" stroke-linecap="round" stroke-dasharray="4 4" class="style-scope yt-icon"></line>
				<line x1="3" y1="12" x2="12" y2="21" stroke-linecap="round" stroke-dasharray="4 4" class="style-scope yt-icon"></line>
				<line x1="12" y1="21" x2="21" y2="12" stroke-linecap="round" stroke-dasharray="4 4" class="style-scope yt-icon"></line>
			</g>
		</svg>
	`;
	static base_pos = {};
	static init(){
		YoutubeEvent.addEventListener("connected",()=>{
			if(YoutubeState.isChildFrame()){
				this.setStyle(this.styles.child);

				// 移動アイコン追加
				const grabBtnOut = document.createElement("yt-icon-button");
				this.tagAddedDOM(grabBtnOut);
				grabBtnOut.id = "overflow";
				grabBtnOut.classList.add("style-scope","yt-live-chat-header-renderer");
				document.querySelector("#chat-messages > yt-live-chat-header-renderer > yt-icon-button#overflow:last-child").before(grabBtnOut);
				const grabBtnIn = document.createElement("yt-icon");
				grabBtnIn.classList.add("style-scope","yt-live-chat-header-renderer");
				grabBtnOut.querySelector("#button").appendChild(grabBtnIn);
				grabBtnIn.insertAdjacentHTML("afterbegin",this.grabIcon);

				YoutubeEvent.addEventListener("ytFullscreen",e=>{
					if(e.detail.args[0]){
						document.documentElement.classList.add("fullscreen");
					}else{
						document.documentElement.classList.remove("fullscreen");
					}
				},{pair:true});
				grabBtnOut.addEventListener("mousedown",e=>{
					top.document.dispatchEvent(new CustomEvent("ext-yc-iframe-grab",{detail:e}));
					document.addEventListener("mousemove",this.iframeMoveEvent);
					document.addEventListener("mouseup",e=>{
						document.removeEventListener("mousemove",this.iframeMoveEvent);
						top.document.dispatchEvent(new CustomEvent("ext-yc-iframe-ungrab",{detail:e}));
					},{once:true});
				});
			}else{
				this.setStyle(this.styles.top);

				const chat_frame = document.querySelector("ytd-live-chat-frame#chat");
				chat_frame.style.top = "0";
				chat_frame.style.left = "0";
				chat_frame.style.width = "400px";

				document.addEventListener("ext-yc-iframe-grab",e=>{
					const chat_frame = document.querySelector("ytd-live-chat-frame#chat");
					this.base_pos = {
						offsetLeft: chat_frame.offsetLeft,
						offsetTop: chat_frame.offsetTop,
						offsetRight: document.body.clientWidth - chat_frame.offsetLeft - chat_frame.offsetWidth,
						grabX: e.detail.screenX,
						grabY: e.detail.screenY
					};
					document.addEventListener("ext-yc-iframe-move",this.moveIframe.bind(this));
				});
				document.addEventListener("ext-yc-iframe-ungrab",e=>{
					document.removeEventListener("ext-yc-iframe-move",this.moveIframe);
				});
			}
		});
	}
	static deinit(){
		if(YoutubeState.isChildFrame()){

		}else{
			const chat_frame = document.querySelector("ytd-live-chat-frame#chat");
			chat_frame.style.top = "";
			chat_frame.style.left = "";
			chat_frame.style.width = "";
		}
		this.removeAddedDOM();
	}
	static iframeMoveEvent(e){
		top.document.dispatchEvent(new CustomEvent("ext-yc-iframe-move",{detail:e}));
	}
	static moveIframe(e){
		const chat_frame = document.querySelector("ytd-live-chat-frame#chat");
		const moveX = e.detail.screenX - this.base_pos.grabX;
		const moveY = e.detail.screenY - this.base_pos.grabY;
		if(this.base_pos.offsetLeft + moveX < 0){
			chat_frame.style.left = "0px";
		}else if(this.base_pos.offsetRight - moveX < 0){
			chat_frame.style.left = this.base_pos.offsetLeft + this.base_pos.offsetRight + "px";
		}else{
			chat_frame.style.left = this.base_pos.offsetLeft + moveX + "px";
		}
		if(this.base_pos.offsetTop + moveY < 0){
			chat_frame.style.top = "0px";
		}else{
			chat_frame.style.top = this.base_pos.offsetTop + moveY + "px";
		}
	}
}

YoutubeInit.init();