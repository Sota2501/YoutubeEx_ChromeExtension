class FullscreenChat extends Ext {
	static name = "FullscreenChat";
	static description = this.i18n("Description");
	static optionsV = 2;
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
					document.querySelector("yt-live-chat-app").setAttribute("yc-fullscreen-chat-text-outline","");
				}else{
					document.querySelector("yt-live-chat-app").removeAttribute("yc-fullscreen-chat-text-outline");
				}
			}
			if(opts["opt-font-size"] != undefined){
				document.documentElement.style.setProperty("--yc-fullscreen-chat-font-size",opts["opt-font-size"] + "px");
			}
			if(opts["opt-background-blur"] != undefined){
				document.documentElement.style.setProperty("--yc-fullscreen-chat-background-blur",opts["opt-background-blur"] + "px");
			}
			if(opts["opt-opacity-def"] != undefined){
				document.documentElement.style.setProperty("--yc-fullscreen-chat-opacity-def",opts["opt-opacity-def"]);
			}
			if(opts["opt-opacity-hover"] != undefined){
				document.documentElement.style.setProperty("--yc-fullscreen-chat-opacity-hover",opts["opt-opacity-hover"]);
			}
			if(opts["opt-use-card"] != undefined){
				if(opts["opt-use-card"]){
					if(opts["opt-card-opacity-def"] != undefined){
						document.documentElement.style.setProperty("--yc-fullscreen-chat-card-opacity-def",opts["opt-card-opacity-def"]);
					}else{
						document.documentElement.style.setProperty("--yc-fullscreen-chat-card-opacity-def",Storage.getOption(`${this.name}-opt-card-opacity-def`,0.9));
					}
					if(opts["opt-card-opacity-hover"] != undefined){
						document.documentElement.style.setProperty("--yc-fullscreen-chat-card-opacity-hover",opts["opt-card-opacity-hover"]);
					}else{
						document.documentElement.style.setProperty("--yc-fullscreen-chat-card-opacity-hover",Storage.getOption(`${this.name}-opt-card-opacity-hover`,0.9));
					}
				}else{
					document.documentElement.style.setProperty("--yc-fullscreen-chat-card-opacity-def",1);
					document.documentElement.style.setProperty("--yc-fullscreen-chat-card-opacity-hover",1);
				}
			}else{
				if(opts["opt-card-opacity-def"] != undefined){
					document.documentElement.style.setProperty("--yc-fullscreen-chat-card-opacity-def",opts["opt-card-opacity-def"]);
				}
				if(opts["opt-card-opacity-hover"] != undefined){
					document.documentElement.style.setProperty("--yc-fullscreen-chat-card-opacity-hover",opts["opt-card-opacity-hover"]);
				}
			}
			if(opts["opt-use-chat-docking"] != undefined){
				if(opts["opt-use-chat-docking"]){
					if(YoutubeState.isFullscreen() && Storage.getStorage(`${this.name}-frame-chat-docking`,false,true)){
						document.querySelector("yt-live-chat-app").setAttribute("yc-fullscreen-chat-chat-docking","");
					}
				}else{
					document.querySelector("yt-live-chat-app").removeAttribute("yc-fullscreen-chat-chat-docking");
				}
			}
		}
	}
	static init(){
		if(YoutubeState.isAppFrame()){
			document.querySelector("ytd-app").setAttribute("yc-fullscreen-chat","");
			YoutubeEvent.addEventListener("ytLoad",this.resetChatDocking);

			document.addEventListener("ext-yc-iframe-set",this.setIframe);
			document.addEventListener("ext-yc-iframe-grab",this.iframeGrabed);
			document.addEventListener("ext-yc-iframe-ungrab",this.iframeUngrabed);
			document.addEventListener("ext-yc-iframe-adjust-fixed-length",this.adjustFixedLengthIframe);
		}else if(YoutubeState.isIframeChatFrame()){
			document.querySelector("yt-live-chat-app").setAttribute("yc-fullscreen-chat","");
			if(Storage.getOption(`${this.name}-opt-text-outline`,true)){
				document.querySelector("yt-live-chat-app").setAttribute("yc-fullscreen-chat-text-outline","");
			}
			document.documentElement.style.setProperty("--yc-fullscreen-chat-font-size",Storage.getOption(`${this.name}-opt-font-size`,16) + "px");
			document.documentElement.style.setProperty("--yc-fullscreen-chat-background-blur",Storage.getOption(`${this.name}-opt-background-blur`,2) + "px");
			document.documentElement.style.setProperty("--yc-fullscreen-chat-opacity-def",Storage.getOption(`${this.name}-opt-opacity-def`,0.6));
			document.documentElement.style.setProperty("--yc-fullscreen-chat-opacity-hover",Storage.getOption(`${this.name}-opt-opacity-hover`,0.9));
			if(Storage.getOption(`${this.name}-opt-use-card`,true)){
				document.documentElement.style.setProperty("--yc-fullscreen-chat-card-opacity-def",Storage.getOption(`${this.name}-opt-card-opacity-def`,0.9));
				document.documentElement.style.setProperty("--yc-fullscreen-chat-card-opacity-hover",Storage.getOption(`${this.name}-opt-card-opacity-hover`,0.9));
			}else{
				document.documentElement.style.setProperty("--yc-fullscreen-chat-card-opacity-def",1);
				document.documentElement.style.setProperty("--yc-fullscreen-chat-card-opacity-hover",1);
			}

			// 移動アイコン追加
			this.moveBtn = (new DOMTemplate("#chat-messages > yt-live-chat-header-renderer > yt-live-chat-button"))
				.ins("before","ytIconButton",{id:"overflow",domTag:"yt-live-chat-header-renderer",svg:this.grabIcon})
				.q("#chat-messages > yt-live-chat-header-renderer > yt-icon-button#overflow",null).tag(this.name)
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
			document.querySelector("yt-live-chat-app").append(this.resizeBtn);
			this.resizeBtn.addEventListener("mousedown",this.iframeDownEvent);

			// フルスクリーン切り替え処理
			this.fullscreenHandler = YoutubeEvent.addEventListener("ytFullscreen",e=>{
				if(e.detail.args[0]){
					document.querySelector("yt-live-chat-app").setAttribute("yc-fullscreen-chat-fullscreen","");
					if(Storage.getOption(`${this.name}-opt-use-chat-docking`,false) && Storage.getStorage(`${this.name}-frame-chat-docking`,false,true)){
						document.querySelector("yt-live-chat-app").setAttribute("yc-fullscreen-chat-chat-docking","");
						this.iframeSet(true);
					}else{
						this.iframeSet(false);
					}
				}else{
					document.querySelector("yt-live-chat-app").removeAttribute("yc-fullscreen-chat-fullscreen");
					document.querySelector("yt-live-chat-app").removeAttribute("yc-fullscreen-chat-chat-docking");
					this.iframeSet(null);
				}
			},{frame:"app"});
			this.dispatchHandler = YoutubeEvent.addEventListener("dispatch",e=>{
				if(e.detail.type == `${this.name}-chat-docking`){
					if(e.detail.data){
						document.querySelector("yt-live-chat-app").setAttribute("yc-fullscreen-chat-chat-docking","");
					}else{
						document.querySelector("yt-live-chat-app").removeAttribute("yc-fullscreen-chat-chat-docking");
					}
				}
			});
			if(YoutubeState.isFullscreen()){
				document.querySelector("yt-live-chat-app").setAttribute("yc-fullscreen-chat-fullscreen","");
				if(Storage.getOption(`${this.name}-opt-use-chat-docking`,false) && Storage.getStorage(`${this.name}-frame-chat-docking`,false,true)){
					document.querySelector("yt-live-chat-app").setAttribute("yc-fullscreen-chat-chat-docking","");
					this.iframeSet(true);
				}else{
					this.iframeSet(false);
				}
			}else{
				document.querySelector("yt-live-chat-app").removeAttribute("yc-fullscreen-chat-fullscreen");
				document.querySelector("yt-live-chat-app").removeAttribute("yc-fullscreen-chat-chat-docking");
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
			document.querySelector("ytd-app").removeAttribute("yc-fullscreen-chat");
			document.querySelector("ytd-app").removeAttribute("yc-fullscreen-chat-fullscreen");
			document.querySelector("ytd-app").removeAttribute("yc-fullscreen-chat-chat-docking");
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
			document.querySelector("yt-live-chat-app").removeAttribute("yc-fullscreen-chat");
			document.querySelector("yt-live-chat-app").removeAttribute("yc-fullscreen-chat-fullscreen");
			document.querySelector("yt-live-chat-app").removeAttribute("yc-fullscreen-chat-text-outline");
			document.documentElement.style.removeProperty("--yc-fullscreen-chat-font-size");
			document.documentElement.style.removeProperty("--yc-fullscreen-chat-background-blur");
			document.documentElement.style.removeProperty("--yc-fullscreen-chat-opacity-def");
			document.documentElement.style.removeProperty("--yc-fullscreen-chat-opacity-hover");
			document.documentElement.style.removeProperty("--yc-fullscreen-chat-card-opacity-def");
			document.documentElement.style.removeProperty("--yc-fullscreen-chat-card-opacity-hover");
			document.querySelector("yt-live-chat-app").removeAttribute("yc-fullscreen-chat-chat-docking");
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
				document.querySelector("ytd-app").setAttribute("yc-fullscreen-chat-chat-docking","");
				this.chatFrame.style.minHeight = "";
				this.chatFrame.style.top = "0";
				this.chatFrame.style.left = "";
				this.chatFrame.style.right = "0";
				this.chatFrame.style.width = "400px"; // Storage.getStorage(`${this.name}-frame-width-docking`,400,true) + "px";
				this.chatFrame.style.height = "100vh";
			}else{
				document.querySelector("ytd-app").removeAttribute("yc-fullscreen-chat-chat-docking");
				this.chatFrame.style.minHeight = "400px";
				this.chatFrame.style.top = Storage.getStorage(`${this.name}-frame-top`,0,true) + "px";
				this.chatFrame.style.left = Storage.getStorage(`${this.name}-frame-left`,0,true) + "px";
				this.chatFrame.style.right = "";
				this.chatFrame.style.width = Storage.getStorage(`${this.name}-frame-width`,400,true) + "px";
				this.chatFrame.style.height = Storage.getStorage(`${this.name}-frame-height`,600,true) + "px";
			}
		}else{
			document.querySelector("ytd-app").removeAttribute("yc-fullscreen-chat-chat-docking");
			this.chatFrame.style.minHeight = "";
			this.chatFrame.style.top = "";
			this.chatFrame.style.left = "";
			this.chatFrame.style.right = "";
			this.chatFrame.style.width = "";
			this.chatFrame.style.height = "";
		}
	}
	static resetChatDocking = (e)=>{
		document.querySelector("ytd-app").removeAttribute("yc-fullscreen-chat-chat-docking");
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
		document.querySelector("ytd-app").removeAttribute("yc-fullscreen-chat-chat-docking");
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
