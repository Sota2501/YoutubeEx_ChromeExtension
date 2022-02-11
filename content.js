// Youtube ad auto skip
function adAutoSkipP(){
	adObCallback();
	waitDOM(document,".video-ads.ytp-ad-module",node=>{
		node.hidden = true;
		(new MutationObserver(adObCallback)).observe(node,{childList:true});
	});
}
function adObCallback(mutationList,observer){
	chrome.storage.sync.get({adTimeoutMilisec:5000},items=>{
		setTimeout(()=>{
			const adSkipBtn = document.querySelector(".video-ads.ytp-ad-module .ytp-ad-skip-button.ytp-button");
			if(adSkipBtn) adSkipBtn.click();
		}, items.adTimeoutMilisec);
	});
}

// Youtube spanner pick
function spannerPickY(){
	chrome.storage.sync.get({myCommentPick: "false", authorName: ""},items=>{
		window.myCommentPick = items.myCommentPick == "true";
		window.authorName = items.authorName;
	});
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

// Youtube strtostamp
function strtostampY(){
	if(location.pathname == "/live_chat"){
		waitDOM(document,"yt-live-chat-app #panel-pages.yt-live-chat-renderer",panel=>{
			waitDOM(panel,"#buttons.yt-live-chat-message-input-renderer #emoji yt-icon.yt-live-chat-icon-toggle-button-renderer",(emojiBtn,obs,panel)=>{
				emojiBtn.click();
				emojiBtn.click();
				waitDOM(panel,"#pickers #categories",categories=>{
					if(categories.querySelector("*:first-child #title").innerText != "Youtube"){
						
					}
				})
			},panel);
		});
	}
}