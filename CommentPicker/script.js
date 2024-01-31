class CommentPicker extends Ext {
	static name = "CommentPicker";
	static description = this.i18n("Description");
	static optionsV = 0;
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
	static scrollButtonTimeoutId = false;
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
				document.querySelector("yt-live-chat-app").setAttribute("yc-comment-picker","");
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
			document.querySelector("yt-live-chat-app").removeAttribute("yc-comment-picker");
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
				if(this.scrollButtonTimeoutId !== false){
					clearTimeout(this.scrollButtonTimeoutId);
				}
				this.scrollButtonTimeoutId = setTimeout(()=>{
					addedScroller.nextElementSibling.style.visibility = "hidden";
					this.userScrolling = false;
				},150);
			}else{
				if(this.scrollButtonTimeoutId !== false){
					clearTimeout(this.scrollButtonTimeoutId);
				}
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
