// Youtube ad auto skip
function adAutoSkipP(){
	adObCallback();
	waitDOM(document,".video-ads.ytp-ad-module",node=>{
		node.hidden = true;
		(new MutationObserver(adObCallback)).observe(node,{childList:true});
	});
}
function adObCallback(mutationList,observer){
	setTimeout(()=>{
		const adSkipBtn = document.querySelector(".video-ads.ytp-ad-module .ytp-ad-skip-button.ytp-button");
		if(adSkipBtn) adSkipBtn.click();
	}, window.options.adTimeoutMilisec);
}

// Youtube spanner pick
function spannerPickY(){
	window.myCommentPick = window.options.myCommentPick == "true";
	window.authorName = window.options.authorName;
	let appOb = waitDOM(document,"ytd-app",app=>{
		chatOb.stop();
		waitDOM(app,"#chat",chat=>{
			chat.addEventListener("yt-toggle-button",spannerIframeInit);
		});
	});
	let chatOb = waitDOM(document,"yt-live-chat-app",chat=>{
		appOb.stop();
		spannerInit(chat);
	});
}
function spannerPickR(){
	let appOb = waitDOM(document,"ytd-app",app=>{
		chatOb.stop();
		waitDOM(app,"#chat",chat=>{
			spannerIframeInit({currentTarget:chat});
		});
	});
	let chatOb = waitDOM(document,"yt-live-chat-app",chat=>{
		appOb.stop();
		spannerInit(chat);
	});
}
function spannerIframeInit(e){
	if(!e.currentTarget.hasAttribute("collapsed")){
		waitDOM(e.currentTarget,"iframe#chatframe",(chatframe,waitOb)=>{
			waitDOM(chatframe.contentDocument,"body",(chatbody,waitOb,chatWaitOb)=>{
				if(chatbody.querySelector("*")){
					chatWaitOb.stop();
					waitDOM(chatbody,"yt-live-chat-app",spannerInit);
				}else{
					waitOb.start()
					chatWaitOb.start()
				}
			},waitOb);
		});
	}
}
function spannerInit(chat){
	waitDOM(chat,"#items.yt-live-chat-item-list-renderer",chatItems=>{
		const afterItems = document.createElement("div");
		const afterItemsStyle = document.createElement("style");
		afterItems.setAttribute("id","fixedCommentList");
		afterItemsStyle.innerText = "#fixedCommentList {left: 0; right: 0; bottom: 0; position: absolute; background-color: #181818; max-height: 150px; overflow: scroll; border-top: 1px solid rgba(255,255,255,0.1)} #fixedCommentList::-webkit-scrollbar {display: none;}";
		chatItems.style.marginBottom = "0px";
		chatItems.after(afterItemsStyle);
		afterItemsStyle.after(afterItems);
		spannerObCallback([{"addedNodes":Array(...chatItems.children),"removedNodes":[]}]);
		(new MutationObserver(spannerObCallback)).observe(chatItems,{childList:true});

	});
}
function spannerObCallback(mutationList,observer){
	let chatframe = document.querySelector("iframe#chatframe");
	if(chatframe){
		chatframe = chatframe.contentWindow.document;
		if(chatframe.querySelector("body>*")){
			let items = chatframe.querySelector("#items.yt-live-chat-item-list-renderer");
			if(items){
				const afterItems = chatframe.querySelector("#fixedCommentList");
				const authorType = ["moderator","owner"];
				mutationList.forEach(mutation=>{
					if(mutation.addedNodes.length){
						mutation.addedNodes.forEach(node=>{
							if(
								authorType.includes(node.getAttribute("author-type")) || 
								node.querySelector("div#content > yt-live-chat-author-chip[is-highlighted]") || 
								myCommentPick && 
								node.querySelector("#author-name") && 
								node.querySelector("#author-name").innerText == authorName
							){
								const replacement = document.createElement("yt-live-chat-text-message-renderer");
								replacement.classList.add("fixingComment");
								replacement.height = node.clientHeight;
								replacement.style.backgroundColor = "var(--yt-live-chat-message-highlight-background-color)";
								replacement.style.visibility = "hidden";
								replacement.dataset.commentId = node.id;
								setTimeout(()=>{
									const fixingComment = chatframe.querySelector("yt-live-chat-text-message-renderer.fixingComment")
									fixingComment.classList.remove("fixingComment");
									fixingComment.querySelector("#content > #message").innerText = "固定化されたコメントです"
									fixingComment.classList.add("fixedComment");
								},100);
								node.after(replacement);
								afterItems.append(node);
								items.style.marginBottom = afterItems.clientHeight + "px";
								afterItems.scrollTo({"top":afterItems.scrollHeight, "behavior":"smooth"});
							}
						})
					}else if(mutation.removedNodes.length){
						mutation.removedNodes.forEach(node=>{
							if(Array.from(node.classList).includes("fixedComment") || Array.from(node.classList).includes("fixingComment")){
								afterItems.querySelector('*[id="'+node.dataset.commentId+'"]').remove();
								items.style.marginBottom = afterItems.clientHeight + "px";
							}
						})
					}
				})
			}
		}
	}
}

// Youtube fullscreenChat
function fullscreenChatP(){
	const alpha1 = 0.5, alpha2 = 0.9;
	const styles = {
		base: `
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
		popup: ``,
		iframe: `
html.fullscreen:not([dark]) {
    --yt-live-chat-background-color: rgba(249,249,249,${alpha1})!important;
    --yt-live-chat-header-background-color: rgba(255,255,255,${alpha1})!important;
    --yt-live-chat-action-panel-background-color: rgba(255,255,255,${alpha1})!important;
    --yt-spec-brand-background-primary: rgba(255,255,255,${alpha1})!important;
	--yt-live-chat-vem-background-color: rgba(252,252,252,${alpha1})!important;
}
html.fullscreen:not([dark]):hover {
    --yt-live-chat-background-color: rgba(249,249,249,${alpha2})!important;
    --yt-live-chat-header-background-color: rgba(255,255,255,${alpha2})!important;
    --yt-live-chat-action-panel-background-color: rgba(255,255,255,${alpha2})!important;
    --yt-spec-brand-background-primary: rgba(255,255,255,${alpha2})!important;
	--yt-live-chat-vem-background-color: rgba(252,252,252,${alpha2})!important;
}
html.fullscreen[dark] {
    --yt-live-chat-background-color: rgba(25,25,25,${alpha1})!important;
    --yt-live-chat-header-background-color: rgba(40,40,40,${alpha1})!important;
    --yt-live-chat-action-panel-background-color: rgba(40,40,40,${alpha1})!important;
    --yt-spec-brand-background-primary: rgba(40,40,40,${alpha1})!important;
	--yt-live-chat-vem-background-color: rgba(62,62,62,${alpha1})!important;
}
html.fullscreen[dark]:hover {
    --yt-live-chat-background-color: rgba(25,25,25,${alpha2})!important;
    --yt-live-chat-header-background-color: rgba(40,40,40,${alpha2})!important;
    --yt-live-chat-action-panel-background-color: rgba(40,40,40,${alpha2})!important;
    --yt-spec-brand-background-primary: rgba(40,40,40,${alpha2})!important;
	--yt-live-chat-vem-background-color: rgba(62,62,62,${alpha2})!important;
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
`,
		grabIcon: `
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
`
	}

	if(location.pathname == "/live_chat" && top == window){		// ポップアップ表示

	}else if(location.pathname == "/live_chat" || location.pathname == "/live_chat_replay"){				// 埋め込み表示
		const iID = setInterval(()=>{
			top.document.dispatchEvent(new CustomEvent("regist_iframe_window",{detail:window}));
		},500);
		window.addEventListener("regist_iframe_window_ok",()=>{
			clearInterval(iID);
		},{once:true});
	
		const style = document.createElement("style");
		style.innerHTML = styles.iframe;
		document.head.appendChild(style);

		const grabBtnOut = document.createElement("yt-icon-button");
		grabBtnOut.id = "overflow";
		grabBtnOut.classList.add("style-scope","yt-live-chat-header-renderer");
		document.querySelector("#chat-messages > yt-live-chat-header-renderer > yt-icon-button#overflow:last-child").before(grabBtnOut);
		const grabBtnIn = document.createElement("yt-icon");
		grabBtnIn.classList.add("style-scope","yt-live-chat-header-renderer");
		grabBtnOut.querySelector("#button").appendChild(grabBtnIn);
		grabBtnIn.insertAdjacentHTML("afterbegin",styles.grabIcon);

		const iframe_move_event = function(e){
			top.document.dispatchEvent(new CustomEvent("iframe_move",{detail:e}));
		};
		grabBtnOut.addEventListener("mousedown",e=>{
			top.document.dispatchEvent(new CustomEvent("iframe_grab",{detail:e}));
			document.addEventListener("mousemove",iframe_move_event);
			document.addEventListener("mouseup",e=>{
				document.removeEventListener("mousemove",iframe_move_event);
				top.document.dispatchEvent(new CustomEvent("iframe_ungrab",{detail:e}));
			},{once:true});
		});
	}else{														// その他ページ
		const style = document.createElement("style");
		style.innerHTML = styles.base;
		document.head.appendChild(style);

		let iframeWin = null;
		const fullscreen_check = function(){
			if(document.body.classList.contains("no-scroll")){
				iframeWin.document.documentElement.classList.add("fullscreen");
			}else{
				iframeWin.document.documentElement.classList.remove("fullscreen");
			}
		}
		document.addEventListener("regist_iframe_window",e=>{
			if(iframeWin == null){
				const chat_frame = document.querySelector("ytd-live-chat-frame#chat");
				chat_frame.style.top = "0";
				chat_frame.style.left = "0";
				chat_frame.style.width = "400px";	
			}
			iframeWin = e.detail;
			iframeWin.dispatchEvent(new Event("regist_iframe_window_ok"));

			new MutationObserver(fullscreen_check)
				.observe(document.body, {attributes: true, attributeFilter: ["class"]});
			fullscreen_check();
		});
		
		let base_pos = [];
		const iframe_move = function(e){
			const chat_frame = document.querySelector("ytd-live-chat-frame#chat");
			const moveX = e.detail.screenX - base_pos.grabX;
			const moveY = e.detail.screenY - base_pos.grabY;
			if(base_pos.offsetLeft + moveX < 0){
				chat_frame.style.left = "0px";
			}else if(base_pos.offsetRight - moveX < 0){
				chat_frame.style.left = base_pos.offsetLeft + base_pos.offsetRight + "px";
			}else{
				chat_frame.style.left = base_pos.offsetLeft + moveX + "px";
			}
			if(base_pos.offsetTop + moveY < 0){
				chat_frame.style.top = "0px";
			}else{
				chat_frame.style.top = base_pos.offsetTop + moveY + "px";
			}
		}
		document.addEventListener("iframe_grab",e=>{
			const chat_frame = document.querySelector("ytd-live-chat-frame#chat");
			base_pos = {
				offsetLeft: chat_frame.offsetLeft,
				offsetTop: chat_frame.offsetTop,
				offsetRight: document.body.clientWidth - chat_frame.offsetLeft - chat_frame.offsetWidth,
				grabX: e.detail.screenX,
				grabY: e.detail.screenY
			};
			document.addEventListener("iframe_move",iframe_move);
		});
		document.addEventListener("iframe_ungrab",e=>{
			document.removeEventListener("iframe_move",iframe_move);
		});
	}
}