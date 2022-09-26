class YoutubeState {
	/**
	 * フレームがiframeかどうか
	 */
	static isChildFrame(){
		return top != window;
	}
	static isFullscreen(){
		return top.document.body.classList.contains("no-scroll")
	}
}

class YoutubeEvent {
	/**
	 * type: 実際に登録するイベント名
	 * window: イベントリスナーをwindowに登録するかどうか
	 * query: windowがfalseのときイベント登録をするDOMのクエリ
	 * options: addEventlistenerのoptionsのデフォルト引数
	 * func: コールバック関数の前処理・後処理をする関数(第一引数:Event,第二引数:コールバック関数)
	 * called: events.onceに関して呼び出されたかどうか
	 * overlapDenyIds: overlapがfalseが指定されている場合にIDを入れておく場所(定義不要)
	 */
	static events = {
		once: {
			// ページ読み込み時
			load: {
				type: "load",
				window: true,
				options: {
					once: true
				},
				called: false
			},
			// Storage初期化完了時
			storageLoad: {
				type: "ext-yc-storage-load",
				window: true,
				options: {
					once: true
				},
				called: false
			},
			// 拡張機能がロードされたとき
			allLoad: {
				type: "ext-yc-all-load",
				window: true,
				options: {
					once: true
				},
				called: false
			},
			// 親フレームと子フレームの拡張機能がイベント送受信可能になったとき
			// Youtubeでページ遷移するとリセットされる
			// 呼び出しされたあとでもdispatch可能
			connected: {
				type: "ext-yc-connected",
				window: true,
				options: {
					once: true
				},
				called: false
			}
		},
		youtube: {
			// ページ遷移が終わったとき
			ytLoad: {
				type: "yt-navigate-finish",
				window: false,
				query: "ytd-app"
			},
			// ページ遷移が始まったとき
			ytUnload: {
				type: "yt-navigate-start",
				window: false,
				query: "ytd-app"
			},
			// フルスクリーンに切り替わったら
			ytFullscreen: {
				type: "yt-action",
				window: false,
				query: "ytd-app",
				func: (e,c)=>{
					if(e.detail?.actionName == "yt-fullscreen-change-action"){
						c(e);
					}
				}
			},
			// オプションが変更されたら
			optionsChanged: {
				type: "ext-yc-option-changed",
				window: true
			},
			ytDebug: {
				type: "yt-action",
				window: false,
				query: "ytd-app",
				func: (e,c)=>{
					if(e.detail){
						c(e.detail);
					}
				}
			}
		},
		signal: {
			// 親フレーム・子フレームに互いのWindowを登録するためのもの
			regist: {
				type: "ext-yt-sig-regist",
				window: true,
				func: (e,c)=>{
					this.frame = e.detail.window;
					c(e);
				}
			},
			// 互いにデータをやりとりするためのもの
			dispatch: {
				type: "ext-yc-sig-dispatch",
				window: true
			}
		}
	}
	static frame = null;
	static init(){
		for(const type in this.events.once){
			this.addEventListener(type, e=>{this.events.once[type].called = e});
		}
		if(YoutubeState.isChildFrame()){
			this.addEventListener("allLoad",()=>{
				let id;
				this.#addEventListener(this.events.signal.regist,()=>{
					clearInterval(id);
					this.dispatchEvent("connected");
					this.addEventListener("ytUnload",()=>{this.events.once.connected.called = false});
				},{once:true});
				id = setInterval(()=>{
					this.#dispatchEvent(this.events.signal.regist,{
						window: window
					},undefined,top);
				},500);
			});
		}else{
			this.addEventListener("allLoad",()=>{
				this.#addEventListener(this.events.signal.regist,()=>{
					this.#addEventListener(this.events.signal.dispatch);
					this.#dispatchEvent(this.events.signal.regist,{
						window: window
					},undefined,this.frame);
					this.events.once.connected.called = false;
					this.dispatchEvent("connected");
					this.addEventListener("ytUnload",()=>{this.events.once.connected.called = false});
				});
			});
		}
	}
	static #query(detail,options){
		let base = options?.pair == true ? this.frame : window;
		base = detail.window ? base : base.document;

		if(!detail.window){
			let ret;
			if(detail.query instanceof Array){
				let i = 0;
				do{
					ret = base.querySelector(detail.query[i]);
				}while(!ret && i < detail.query.length);
			}else{
				ret = base.querySelector(detail.query);
			}
			return ret;
		}else{
			return base;
		}
	}
	static #addEventListener(detail,callback,options=detail.options,dom=this.#query(detail,options)){
		let delOverlapDenyIdCallback = callback;
		if(options?.overlapDeny){
			if(detail.overlapDenyIds == undefined){
				detail.overlapDenyIds = [];
			}
			if(detail.overlapDenyIds.indexOf(options.overlapDeny) >= 0){
				return false;
			}
			detail.overlapDenyIds.push(options.overlapDeny);
			delOverlapDenyIdCallback = e=>{
				callback(e);
				let id = detail.overlapDenyIds.indexOf(options.overlapDeny);
				if(id >= 0){
					delete detail.overlapDenyIds[id];
				}
			}
		}
		if(dom){
			const f = detail.func ? e=>{detail.func(e,delOverlapDenyIdCallback)} : delOverlapDenyIdCallback;
			dom.addEventListener(detail.type, f, options);
			return f;
		}else{
			return false;
		}
	}
	static #removeEventListener(detail,callback,options=detail.options,dom=this.#query(detail,options)){
		if(options?.overlapDeny){
			let id = detail.overlapDenyIds.indexOf(options.overlapDeny);
			if(id >= 0){
				delete detail.overlapDenyIds[id];
			}
		}
		if(dom){
			dom.removeEventListener(detail.type, callback);
			return true;
		}else{
			return false;
		}
	}
	static #dispatchEvent(detail,data,options,dom=this.#query(detail,options)){
		if(dom){
			if(data){
				dom.dispatchEvent(new CustomEvent(detail.type,{detail: data}));
			}else{
				dom.dispatchEvent(new Event(detail.type));
			}
			return true;
		}else{
			return false;
		}
	}
	/**
	 * 設定済みイベントを登録する
	 * @param {string} type イベントタイプ(複数イベントはスペース区切り)
	 * @param {function|null} callback コールバック関数
	 * @param {object} options イベントオプション {pair:bool,overlapDeny:string}
	 * @returns イベントハンドラ
	 */
	static addEventListener(types,callback,options){
		let res = [];
		if(!callback){
			return null;
		}
		for(let type of types.split(" ")){
			if(Object.keys(this.events.once).indexOf(type) >= 0){
				const detail = this.events.once[type];
				if(detail.called instanceof Event){
					callback(detail.called);
					res.push(true);
				}else{
					res.push(this.#addEventListener(detail,callback,options));
				}
			}else if(Object.keys(this.events.youtube).indexOf(type) >= 0){
				const detail = this.events.youtube[type];
				res.push(this.#addEventListener(detail,callback,options));
			}else if(type == "dispatch"){
				const detail = this.events.signal.dispatch;
				res.push(this.#addEventListener(detail,callback,options));
			}
		}
		if(res.length == 0){
			return null
		}else if(res.length == 1){
			return res[0];
		}else{
			return res;
		}
	}
	/**
	 * 登録されたイベントを削除する
	 * イベントリスナーでは関数を書き換えているので返された関数を使用する必要がある
	 * @param {string} type イベントタイプ
	 * @param {function} callback イベントリスナーから返された関数
	 * @param {object} options イベントオプション {pair:bool,overlapDeny:string}
	 * @returns 削除できたかどうか
	 */
	static removeEventListener(type,callback,options){
		if(Object.keys(this.events.once).indexOf(type) >= 0){
			const detail = this.events.once[type];
			if(!(detail.called instanceof Event)){
				return this.#removeEventListener(detail,callback,options);
			}
		}else if(Object.keys(this.events.youtube).indexOf(type) >= 0){
			const detail = this.events.youtube[type];
			return this.#removeEventListener(detail,callback,options);
		}
		return false;
	}
	/**
	 * 設定済みイベントをdispatchする
	 * @param {string} type イベントタイプ
	 * @param {object} data カスタムイベント送信用
	 * @param {object} options イベントオプション {pair:bool}
	 * @returns dispatchしたかどうか(onceは実行済みの場合dispatchされない)
	 */
	static dispatchEvent(type,data,options){
		if(Object.keys(this.events.once).indexOf(type) >= 0){
			const detail = this.events.once[type];
			if(detail.called instanceof Event){
				return false;
			}else{
				return this.#dispatchEvent(detail,data,options);
			}
		}else if(Object.keys(this.events.youtube).indexOf(type) >= 0){
			const detail = this.events.youtube[type];
			return this.#dispatchEvent(detail,data,options);
		}else if(type == "dispatch"){
			const detail = this.events.signal.dispatch;
			return this.#dispatchEvent(detail,data,{pair:true});
		}
		return false;
	}
}
YoutubeEvent.init();

class Ext {
	static name = "";
	static description = "";
	static styleNum = 1;
	static init(){}
	static deinit(){}
	static optionsUpdated(){}
	static registOptions(){}
	static tagAddedDOM(dom){
		dom.setAttribute("data-ext-yc",this.name);
	}
	static setStyle(css){
		const style = document.createElement("style");
		this.tagAddedDOM(style);
		style.setAttribute("data-style-id",this.styleNum);
		style.innerHTML = css;
		document.head.appendChild(style);
		return this.styleNum++;
	}
	static removeStyle(id){
		const styles = document.querySelectorAll(`style[data-ext-yc="${this.name}"]`+(id?`[data-style-id="${id}"]`:""));
		styles.forEach(e=>e.remove());
	}
	static removeAddedDOM(){
		const dom = document.querySelectorAll(`[data-ext-yc="${this.name}"]`);
		dom.forEach(e=>e.remove());
	}
	static replace(html,placeholders){
		for(let placeholder in placeholders){
			html = html.replace("[["+placeholder+"]]",placeholders[placeholder]);
		}
		return html;
	}
}

class Storage {
	static v = 1;
	static useLocal;
	static stage = {};
	static options;
	static init(){
		let sync, local;
		let setOptions = (sync,local)=>{
			if(local["v"] == undefined){
				let def = {v:this.v};
				for(let ex in extensions){
					def[ex] = true;
				}
				chrome.storage.local.set(Object.assign({"flag-use-local":false},def));
				if(sync["v"] == undefined){
					chrome.storage.sync.set(Object.assign({},def));
					this.options = def;
				}else{
					this.options = sync;
				}
				this.useLocal = false;
			}else if(local["flag-use-local"]){
				this.useLocal = true;
				this.options = local;
			}else{
				this.useLocal = false;
				this.options = sync;
			}
			delete this.options["v"];
			delete this.options["flag-use-local"];
			YoutubeEvent.dispatchEvent("storageLoad");
		}
		chrome.storage.local.get(null,items=>{
			local = items;
			if(sync){
				setOptions(sync,local);
			}
		});
		chrome.storage.sync.get(null,items=>{
			sync = items;
			if(local){
				setOptions(sync,local);
			}
		});
		YoutubeEvent.addEventListener("dispatch",e=>{
			if(e.detail.type == "Storage-sync"){
				for(let k in e.detail.data){
					this.options[k] = e.detail.data[k];
				}
			}
		});
	}
	static getOption(name,def){
		return this.options[name] || def;
	}
	static setOption(name,val){
		let data = {};
		data[name] = val;
		this.setOptions(data);
	}
	static setOptions(data){
		YoutubeEvent.dispatchEvent("dispatch",{type:"Storage-sync",data:data});
		for(let k in data){
			this.options[k] = data[k];
		}
	}
	static saveOption(name,val){
		let data = {};
		data[name] = val;
		this.saveOptions(data);
	}
	static saveOptions(data){
		this.setOptions(data);
		chrome.storage[this.useLocal?"local":"sync"].set(data);
	}

	// オプション画面時に使用
	static setStage(name,val){
		if(this.options[name] != val){
			this.stage[name] = val;
		}else{
			delete this.stage[name];
		}
	}
	static reflectStage(){
		YoutubeEvent.dispatchEvent("optionsChanged",this.stage);
		YoutubeEvent.dispatchEvent("optionsChanged",Object.assign({},this.stage),{pair:true});
		this.setOptions(Object.assign({},this.stage));
		this.stage = {};
	}
	static saveStorage(useLocal){
		let data = Object.assign(Object.assign({},this.options),this.stage);
		chrome.storage[useLocal?"local":"sync"].set(data);
	}
}
Storage.init();

class Options extends Ext {
	static name = "Options";
	static styles = {
		toggleButton: `
			#toggle {
				touch-action: pan-y;
				margin: 0 8px;
			}
			#toggle-container {
				display: inline-block;
				position: relative;
				width: 36px;
				height: 14px;
				margin: 4px 1px;
			}
			#toggle-bar {
				position: absolute;
				height: 100%;
				width: 100%;
				border-radius: 8px;
				pointer-events: none;
				transition: background-color linear 0.08s;
				background-color: #717171;
				opacity: 0.4;
			}
			#toggle[disabled] #toggle-bar {
				background-color: #000;
				opacity: 0.12;
			}
			#toggle-button {
				position: absolute;
				top: -3px;
				left: 0;
				right: auto;
				height: 20px;
				width: 20px;
				border-radius: 50%;
				transition: transform linear 0.08s, background-color linear 0.08s;
				will-change: transform;
				background-color: #fff;
			}
			@keyframes toggle-button-shadow-on {
				from {
					box-shadow: 0 0 0 0 rgba(0 0 0 / 10%);
				}
				to {
					box-shadow: 0 0 0 13.5px rgba(0 0 0 / 10%);
				}
			}
			@keyframes toggle-button-shadow-off {
				from {
					box-shadow: 0 0 0 13.5px rgba(0 0 0 / 10%);
				}
				to {
					box-shadow: 0 0 0 13.5px rgba(0 0 0 / 0%);
				}
			}
			#toggle:not(:focus) #toggle-button {
				animation: toggle-button-shadow-off 0.08s linear both;
			}
			#toggle:focus #toggle-button {
				animation: toggle-button-shadow-on 0.08s linear both;
			}
			#toggle[checked] #toggle-button {
				transform: translate(16px, 0);
			}
			#toggle[checked]:not([disabled]) #toggle-button {
				background-color: #3ea6ff;
			}
			#toggle[disabled] #toggle-button {
				background: #bdbdbd;
				opacity: 1;
			}
		`,
		child: `
			#ext-yc-menu-item {
				cursor: pointer;
				display: flex;
				flex-direction: column;
			}
			#ext-yc-menu-item[use-icons] {
				--yt-menu-item-icon-display: inline-block;
			}
			#ext-yc-options-wrapper {
				color: var(--yt-live-chat-primary-text-color,var(--yt-spec-text-primary));
				z-index: 0;
				flex: 1;
				flex-basis: 1e-9px;
				display: flex;
				flex-direction: column;
			}
			#ext-yc-options {
				overflow-y: auto;
				flex: 1;
				flex-basis: 1e-9px;
			}
			#ext-yc-options #items {
				padding: 8px 16px;
			}
			#ext-yc-options-wrapper #header {
				padding: 8px;
				height: 48px;
				box-sizing: border-box;
				background-color: var(--yt-live-chat-action-panel-background-color,var(--yt-deprecated-opalescence-soft-grey-opacity-lighten-3));
				font-size: var(--yt-live-chat-header-font-size,18px);
				line-height: 24px;
				box-shadow: var(--yt-live-chat-header-box-shadow);
				display: flex;
				flex-direction: row;
				align-items: center;
				flex: none;
				z-index: 1;
			}
			#ext-yc-options-wrapper #back-button {
				margin: 0 8px;
			}
			#ext-yc-options-wrapper #back-button > * {
				--yt-button-color: var( --yt-live-chat-primary-text-color, var(--yt-deprecated-luna-black-opacity-lighten-3) );
			}
			#description {
				color: var(--yt-spec-text-primary);
				margin: 8px 0 16px;
				font-family: "Roboto","Arial",sans-serif;
				font-size: 1.4rem;
				line-height: 2rem;
				font-weight: 400;
			}
			#caption-container {
				display: flex;
				flex-direction: row;
				align-items: center;
				margin: 8px 0;
			}
			#caption {
				color: var(--yt-spec-text-secondary);
				font-size: var(--ytd-tab-system-font-size);
				font-weight: var(--ytd-tab-system-font-weight);
				letter-spacing: var(--ytd-tab-system-letter-spacing);
				text-transfoorm: var(--ytd-tab-system-text-transform);
				flex: 1;
				flex-basis: 1e-9px;
			}
		`
	};
	static extIcon = `
		<svg viewBox="0 0 24 24" focusable="false" class="style-scope yt-icon" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<style>
				div.ytd-menu-popup-renderer yt-icon.ytd-menu-service-item-renderer {
					fill: var(--yt-spec-text-primary)
				}
			</style>
			<g class="style-scope yt-icon">
				<path d="M7,21l4-4h8c1.1,0,2-.9,2-2v-10c0-1.1-0.9-2-2-2h-14c-1.1,0-2,.9-2,2v10c0,1.1,.9,2,2,2h2v4ZM6,6h12v2h-12v-2ZM6,9h12v2h-12v-2ZM6,12h12v2h-12v-2Z"></path>
			</g>
		</svg>
	`;
	static backIcon = `
		<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" class="style-scope yt-icon" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<g mirror-in-rtl="" class="style-scope yt-icon">
				<path d="M21,11v1H5.64l6.72,6.72l-0.71,0.71L3.72,11.5l7.92-7.92l0.71,0.71L5.64,11H21z" class="style-scope yt-icon"></path>
			</g>
		</svg>
	`;
	static menuItem = `
		<div id="ext-yc-menu-item" class="style-scope ytd-menu-popup-renderer" use-icons="" system-icons="" role="menuitem">
			<tp-yt-paper-item class="style-scope ytd-menu-service-item-renderer" style-target="host" role="option" tabindex="0" aria-disabled="false">
				<yt-icon class="style-scope ytd-menu-service-item-renderer"></yt-icon>
				<yt-formatted-string class="style-scope ytd-menu-service-item-renderer"></yt-formatted-string>
			</tp-yt-paper-item>
		</div>
	`;
	static optionsPage = `
		<div id="ext-yc-options-wrapper" class="style-scope yt-live-chat-renderer">
			<div id="header" role="heading" class="style-scope yt-live-chat-renderer" aria-label="拡張機能の設定">
				<div id="back-button" class="style-scope yt-live-chat-renderer">
					<yt-button-renderer class="style-scope yt-live-chat-renderer" is-icon-button="" has-no-text=""></yt-button-renderer>
				</div>
				拡張機能の設定
			</div>
			<div id="ext-yc-options" class="style-scope yt-live-chat-renderer">
				<div id="items" class="style-scope yt-live-chat-renderer"></div>
			</div>
		</div>
	`;
	static backButton = `
		<a class="yt-simple-endpoint style-scope yt-button-renderer">
			<yt-icon-button id="button" class="style-scope yt-button-renderer" aria-label="戻る"></yt-icon-button>
		</a>
	`;
	static toggleButton = `
		<div id="caption-container" class="style-scope">
			<div id="caption" class="style-scope">[[description]]</div>
			<div id="toggle" class="style-scope" role="button" tabindex="0" data-option="[[option-name]]"[[checked]]>
				<div id="toggle-container" class="style-scope">
					<div id="toggle-bar" class="style-scope"></div>
					<div id="toggle-button" class="style-scope"></div>
				</div>
			</div>
		</div>
	`;
	static init(){
		if(YoutubeState.isChildFrame()){
			this.setStyle(this.styles.toggleButton);
			this.setStyle(this.styles.child);
			// 設定画面作成
			document.querySelector("yt-live-chat-ninja-message-renderer").insertAdjacentHTML("beforebegin",this.optionsPage);
			document.querySelector("#ext-yc-options-wrapper yt-button-renderer").insertAdjacentHTML("afterbegin",this.backButton);
			document.querySelector("#ext-yc-options-wrapper yt-icon-button").addEventListener("click",this.backToChat);
			const ytIcon = document.createElement("yt-icon");
			ytIcon.classList.add("style-scope","yt-button-renderer");
			document.querySelector("#ext-yc-options-wrapper button").appendChild(ytIcon);
			ytIcon.insertAdjacentHTML("afterbegin",this.backIcon);
			
			const options = document.querySelector("#ext-yc-options #items");
			options.innerHTML = "";
			const description = document.createElement("div");
			description.id = "description";
			description.classList.add("style-scope");
			description.innerText = "この設定画面では設定項目はすぐに反映されます。ただし、設定項目は現在のページのみに適用されるため、設定を永続的に反映させたい場合は保存する必要があります。また、保存した内容を他のページで利用する場合は再読み込みをする必要があります。";
			options.appendChild(description);
			
			// 拡張機能設定初期化処理
			YoutubeEvent.addEventListener("allLoad",()=>{
				for(let ex in extensions){
					// 設定内容追加
					options.insertAdjacentHTML("beforeend",this.replace(this.toggleButton,{"option-name":ex,description:extensions[ex].description,checked:(Storage.getOption(ex)?" checked":"")}));
					extensions[ex].registOptions(options);
					// 初期化処理
					if(Storage.getOption(ex)){
						extensions[ex].init();
					}
				}
				YoutubeEvent.addEventListener("optionsChanged",this.optionsUpdated);
				document.querySelectorAll("#toggle").forEach(e=>e.addEventListener("click",this.toggle));
			});

			// ポップアップのメニューアイテム作成
			document.querySelector("#chat-messages > yt-live-chat-header-renderer > yt-icon-button#overflow:last-child").addEventListener("click",()=>{
				const wrapper = document.querySelector("yt-live-chat-app > tp-yt-iron-dropdown tp-yt-paper-listbox");
				wrapper.insertAdjacentHTML("beforeend",this.menuItem);
				const menuItem = wrapper.querySelector("#ext-yc-menu-item");
				menuItem.querySelector("yt-icon").insertAdjacentHTML("afterbegin",this.extIcon);
				menuItem.querySelector("yt-formatted-string").innerHTML = "拡張機能の設定";
				menuItem.querySelector("yt-formatted-string").removeAttribute("is-empty");
				menuItem.addEventListener("click",this.openOptions);
			});
		}else{
			YoutubeEvent.addEventListener("allLoad",()=>{
				for(let ex in extensions){
					if(Storage.getOption(ex)){
						extensions[ex].init();
					}
				}
				YoutubeEvent.addEventListener("optionsChanged",this.optionsUpdated);
			});
		}
	}
	static optionsUpdated = (e)=>{
		for(let ex in extensions){
			const st = this.getExUpdated(ex,e.detail);
			if(typeof st == "boolean"){
				if(st){
					extensions[ex].init();
				}else{
					extensions[ex].deinit();
				}
			}else if(st != null){
				extensions[ex].optionsUpdated(st);
			}
		}
	}
	static getExUpdated = (name,stage)=>{
		let data = {};
		for(let k in stage){
			const m = k.match(new RegExp(`^(${name})\\-?(.*)`));
			if(m){
				if(m[2] == ""){
					return stage[k];
				}else{
					data[m[2]] = stage[k];
				}
			}
		}
		if(Object.keys(data).length == 0){
			return null;
		}else{
			return data;
		}
	}
	static openOptions = ()=>{
		document.querySelector("#ext-yc-options-wrapper").click();
		document.querySelector("#ext-yc-options-wrapper").classList.add("iron-selected");
		document.querySelector("#chat-messages").classList.remove("iron-selected");
	}
	static backToChat = ()=>{
		document.querySelector("#chat-messages").classList.add("iron-selected");
		document.querySelector("#ext-yc-options-wrapper").classList.remove("iron-selected");
		const itemOffset = document.querySelector("#chat-messages #item-offset");
		if(itemOffset.style.height == "0px"){
			setTimeout(()=>itemOffset.parentElement.scrollTo(0,itemOffset.children.item(0).scrollHeight));
		}
		itemOffset.style.height = itemOffset.children.item(0).clientHeight + "px";
		itemOffset.style.minHeight = itemOffset.parentElement.clientHeight + "px";
		
		// Storage変更適用
		Storage.reflectStage();
	}
	static toggle = (e)=>{
		if(e.currentTarget.getAttribute("disabled") == null){
			if(e.currentTarget.getAttribute("checked") == null){
				e.currentTarget.setAttribute("checked","");
				Storage.setStage(e.currentTarget.dataset.option,true);
			}else{
				e.currentTarget.removeAttribute("checked");
				Storage.setStage(e.currentTarget.dataset.option,false);
			}
		}
	}
}
Options.init();