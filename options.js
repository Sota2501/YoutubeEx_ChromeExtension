document.addEventListener("DOMContentLoaded",()=>{
	document.querySelectorAll('input[type="checkbox"]').forEach(elm=>{
		elm.dataset.save_type = "check";
	});
	document.querySelectorAll('input[type="text"]').forEach(elm=>{
		elm.dataset.save_type = "raw";
	});
	document.querySelectorAll('input[type="number"]').forEach(elm=>{
		elm.dataset.save_type = "number";
	})
	document.querySelector("#saveBtn").addEventListener("click", e=>{
		document.querySelector("#saveBtn").disabled = true;
		document.querySelector("#status").innerText = "保存中";
		let save_data = {};
		document.querySelectorAll(".input").forEach(elm=>{
			// 保存ボタンクリック時動作
			switch(elm.dataset.save_type){
				case "raw":
					save_data[elm.id] = elm.value;
					break;
				case "dict":
					try{
						save_data[elm.id] = JSON.parse(elm.value);
					}catch(e){
						document.querySelector("#status").innerText = elm.id + ": 辞書型に変換できませんでした";
						console.error(e);
						setTimeout(()=>{
							document.querySelector("#status").innerText = "";
							document.querySelector("#saveBtn").disabled = false;
						},1000);
					}
					break;
				case "list":
					const children = Array(...elm.children)
					let data = [];
					let row = [];
					for(let i = 0; i < children.length; i++){
						if(children[i].tagName == "DT"){
							row.push(children[i].querySelector("input").value);
						}else{
							data.push(row);
							row = [];
						}
					}
					save_data[elm.id] = data;
					break;
				case "check":
					save_data[elm.id] = elm.checked.toString();
					break;
				case "number":
					save_data[elm.id] = (Number)(elm.value);
					break;
			}
		});
		save_data.func = [];
		document.querySelectorAll(".func").forEach(elm=>{
			save_data.func.push(elm.id);
		});
		chrome.storage.sync.set(save_data,()=>{
			document.querySelector("#status").innerText = "保存完了";
			setTimeout(()=>{
				document.querySelector("#status").innerText = "";
				document.querySelector("#saveBtn").disabled = false;
			},1000);
		});
	});
	document.querySelector("#debugBtn").addEventListener("dblclick",()=>{
		chrome.storage.sync.get(null,items=>{
			console.log(items);
		});
	});
	let get_data = {};
	document.querySelectorAll(".input").forEach(elm=>{
		if(elm.dataset.def_val){
			// 読み込み時デフォルト設定
			switch(elm.dataset.save_type){
				case "raw":
					get_data[elm.id] = elm.dataset.def_val;
					break;
				case "dict":
					get_data[elm.id] = JSON.parse(elm.dataset.def_val);
					break;
				case "list":
					get_data[elm.id] = JSON.parse(elm.dataset.def_val);
					break;
				case "check":
					get_data[elm.id] = elm.dataset.def_val;
					break;
				case "number":
					get_data[elm.id] = (Number)(elm.dataset.def_val);
					break;
			}
		}else{
			get_data[elm.id] = "";
		}
	});
	chrome.storage.sync.get(get_data,items=>{
		document.querySelectorAll(".input").forEach(elm=>{
			// 読み込み時保存データ格納
			switch(elm.dataset.save_type){
				case "raw":
					elm.value = items[elm.id];
					break;
				case "dict":
					elm.value = JSON.stringify(items[elm.id]);
					break;
				case "list":
					const data = items[elm.id];
					data.forEach(row=>{
						addtolist(elm,row)
					})
					break;
				case "check":
					elm.checked = items[elm.id] == "true";
					break;
				case "number":
					elm.value = items[elm.id];
					break;
			}
		});
		document.querySelectorAll('section input[type="checkbox"]').forEach(elm=>{
			function showToggle(e){
				let p = e.target;
				while(p.parentElement.tagName != "SECTION"){
					p = p.parentElement;
				}
				p.nextElementSibling.hidden = !e.target.checked;
			}
			showToggle({target: elm});
			elm.addEventListener("click",showToggle);
		});
		document.querySelectorAll(".listAddBtn").forEach(elm=>{
			elm.addEventListener("click",e=>{
				const elm = e.target;
				addtolist(document.querySelector(elm.dataset.addto),JSON.parse(elm.dataset.def_val));
			})
		});
	});
});

function addtolist(addto,row){
	row.forEach(cell=>{
		const dt = document.createElement("dt");
		const input = document.createElement("input");
		input.type = "text";
		input.value = cell;
		dt.append(input);
		addto.append(dt);
	});
	const dd = document.createElement("dd");
	const input = document.createElement("input");
	input.type = "button";
	input.addEventListener("click", e=>{
		let p = e.target.parentElement;
		while(p.previousElementSibling != null && p.previousElementSibling.tagName != "DD"){
			p = p.previousElementSibling;
			p.nextElementSibling.remove();
		}
		p.remove();
	});
	input.value = "削除";
	dd.append(input);
	addto.append(dd);
}