(function($) { 
/* 
「(function($){})(jQuery)」は「jQuery」のオブジェクトを引数として渡し、
グローバルで$が変数として利用されていても、「$ = jQuery」として利用できるようにしている。
無名関数なので、定義した変数のスコープ範囲は関数内のみとなり、他のスクリプトに影響を及ぼさない。
*/

// DOMの準備が完了した後、{}を実行
$(function(){ // 「jQuery(document).ready(function(){})」の省略形

/* 変更履歴
*/

	var imgRatio_ = "0.37"; // 2026-04-12 追加

	var token_;
	
	var folderPathLength = location.href.lastIndexOf("/");
	var folderPath = location.href.substring(0,folderPathLength);
	var url = folderPath + "/mymap.kml";
	var heightPhoto = 500;
	var scrollTopSpeed = 500; // (ms) ページトップに戻るボタンのスピード
	var scrollTopFade = 1000; // (ms) ページトップに戻るボタンのフェード
	var slideshowCloseButtonDuration = 3000; // (ms) スライドショーを閉じるボタンを表示する期間
	var slideCloseButtonDuration = 3000; // (ms) スライドを閉じるボタンを表示する期間
	var animationDuration = 1000; // (ms) アニメーションの遷移時間

	var isRecord = true;
	var flickrPhotoset = [];
	var shellsPhotoset = [];
	var recordPhotoset = [];
	var shellPhotos = [];
	var recordSets = [];
	var photoImage = [];
	var photoImage2 = [];
	var photoImageActive = [];
	var photoImageActive2 = [];

	var isRecord = true;

	var currentScrollTop = 0;
	var slideImage;
	var photoIndex;
	var slideSrc = [];
	var currentSlide = 0;

	$("#initialize").css({display: "block"}); 
	$("#photosets").css({display: "none"});

	const event = new Event('scroll');

	$("#logout").on( "click", function() {
		agent.clearToken();
		$("body").html("");
		alert("ログアウトしました");
	});

	$("#map-container").css({display: "none"}); // 2020-05-01
	$("#photo-to-map").css({display: "none"});
	$("#book-container").css({display: "none"});

	// Loading image の表示
    $("#photo-container").prepend("<div id='showImgSequence-loading-image'><img src='http://s10-4bn.sunnyday.jp/_img/img-loading.gif'></div>");
    $("#showImgSequence-loading-image").css({
        position: "fixed",
        bottom: "15px",
        left: "15px",
        opacity: "0.7",
		zIndex: "99"
	});

	//ページトップに戻るボタン等の定義
	$("#btn-top").hide();
	$("#btn-top").click(function() {
		$("html,body").animate({scrollTop: 0}, scrollTopSpeed, 'swing');
	});
	$(window).scroll(function(){
		if ( $(this).scrollTop() > 100) {
			$("#btn-top").fadeIn(scrollTopFade);
		} else {
			$("#btn-top").fadeOut(scrollTopFade);
		}	
	});

var counter = 0;
var totalFiles = 100;

// ==========================================
// 1. IndexedDB（記憶倉庫）を扱うための共通関数
// ==========================================
const DB_NAME = 'FileSystemDB';
const STORE_NAME = 'Handles';
// 開いているHTMLファイル名ごとに自動で引き出し（キー）を分ける
const KEY_NAME = 'folder_handle_' + window.location.pathname.replace(/\//g, "_");

function getDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.onerror);
    });
}
async function saveHandle(handle) {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, KEY_NAME);
}
async function loadHandle() {
    const db = await getDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(KEY_NAME);
        req.onsuccess = () => resolve(req.result);
    });
}

// ==========================================
// IndexedDBから記憶（ハンドル）を削除する関数
// ==========================================
async function deleteHandle() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        // 指定したKEY_NAMEの記憶だけを削除する
        const req = tx.objectStore(STORE_NAME).delete(KEY_NAME);
        
        req.onsuccess = () => {
            console.log("保存されていたフォルダの記憶を削除しました。");
            globalFolderHandle = null; // 変数の中身も空にする
            resolve();
        };
        req.onerror = () => reject(req.error);
    });
}

// File System Access API で選択した入力元フォルダ
let globalFolderHandle = null; // 選択されたフォルダの鍵を保持するグローバル変数

// フォルダ内のファイルをサブフォルダも含めて再帰的に取得
async function collectLocalFiles(directoryHandle, relativeDirectory, result) {
    for await (const entry of directoryHandle.values()) {
        var relativePath = relativeDirectory
            ? relativeDirectory + "/" + entry.name
            : entry.name;

        if (entry.kind === "directory") {
            await collectLocalFiles(entry, relativePath, result);
        } else if (entry.kind === "file") {
            var file = await entry.getFile();
            result.push({
                file: file,
                relativePath: relativePath
            });
//console.log(totalFiles);
            counter++;
            // 50件見つかるごとに、画面上部のバーを少し（10% → 30%）伸ばす
            if (counter % 50 === 0) {
                let tempPercent =Math.floor(counter / totalFiles * 100);
                $("#top-progress-bar").css("width", tempPercent + "%");
                await new Promise(resolve => setTimeout(resolve, 0));
            }

        }
    }


	        // 選択したフォルダの鍵を IndexedDB に記憶させる
//console.log(counter);
	        await saveHandle({
				handle: globalFolderHandle,
				totalFiles: counter
			});

}

window.onload = async function () {

	$("#initialize").css({display: "block"}); 
	$("#photosets").css({display: "none"});
	$("#photoset").css({display: "none"});


    // 過去にこのページで選択したフォルダの記憶があるか確認
    const savedHandle = await loadHandle();
    if (savedHandle) {
        globalFolderHandle = savedHandle.handle;
		totalFiles = Math.max( Number(savedHandle.totalFiles), 4000 );
        // ?? 画面上に「前回と同じフォルダを再開する」ボタンや案内を出したい場合はここで制御します
        // 例: $("#btn-resume").show();
        // ここでは確認用にコンソールに残します
        console.log(`過去のフォルダ「${globalFolderHandle.name}」の記憶があります。`);
        
        // 自動で再承認処理（ポップアップ確認）を走らせたい場合は、ここで後述の resumeFolder() を呼び出してもOKです
        resumeFolder(); 
    }


	$("#selectLocalPhotoFolder").on("click", async function() {
	    if (!window.showDirectoryPicker) {
	        alert("このブラウザでは File System Access API に対応していません。Chrome または Edge で http://localhost / https:// から開いてください。");
	        return;
	    }
	
	        // 新しくフォルダ選択画面を開く
	        globalFolderHandle = await window.showDirectoryPicker({ mode: "readwrite" });
	
		executeFolderProcess()

		
	});
	
	document.addEventListener("keydown", async function(event) {
	    if (event.ctrlKey && event.key.toLowerCase() === "q") {
	        event.preventDefault();
			await deleteHandle();
			location.reload();
/*
			$("#initialize").show(); 
			$("#photosets").hide();
			$("#photoset").hide();
			$("#top-progress-container").hide();
			counter = 0;
*/
	    }
	});
		
}

// ==========================================
// 4. 過去の記憶からフォルダへのアクセスを再開する関数
// ==========================================
async function resumeFolder() {
    if (!globalFolderHandle) return;
    try {
        // ブラウザに「前と同じあのフォルダにアクセスしていい？」のポップアップを出させる
        const opts = { mode: 'readwrite' };
        if ((await globalFolderHandle.queryPermission(opts)) !== 'granted') {
            if ((await globalFolderHandle.requestPermission(opts)) !== 'granted') {
                console.log('フォルダへのアクセス権がユーザーに拒否されました。');
                return;
            }
        }
        
        console.log(`フォルダ「${globalFolderHandle.name}」へのアクセスを再開しました。`);
        
        // 4.の共通処理を実行する
        executeFolderProcess();


        
    } catch (err) {
        console.error("フォルダの再開に失敗しました。フォルダが移動された可能性があります:", err);
    }
}


async function executeFolderProcess() {

	$("#top-progress-container").show();
	$("#initialize").hide(); 

	var files = [];
	// File System Access API　で　filesを取得

	await collectLocalFiles(globalFolderHandle, "", files); 

	$("#photosets").show();
    $("#top-progress-container").hide();

	files = files.filter(function(item) {
    	return /\.(jpe?g|txt)$/i.test(item.file.name);
    });

    if (!files.length) {
        return;
    }

	files = files.map(function(item) {
	    item.file.localRelativePath = item.relativePath;
	    return item.file; 
	});

    // ==================================================
    // フォルダごとに写真を分類
    // ==================================================

    var folders = {};


    $.each(files, function(i, file) {

        var path = file.localRelativePath || file.name;

        var parts = path.split("/");

        /*
         * 例えば
         *
         * 写真記録/伊豆/IMG_001.jpg
         *
         * の場合
         *
         * parts[0] = 写真記録
         * parts[1] = 伊豆
         * parts[2] = IMG_001.jpg
         */

        var folderName;

        if (parts.length >= 3) {

            folderName = parts[1];

        } else {

            folderName = parts[0];
        }


        if (!folders[folderName]) {

            folders[folderName] = [];
        }

        folders[folderName].push(file);

    });


    // ==================================================
    // フォルダ名を並べる
    // ==================================================

    var folderNames = Object.keys(folders);

	folderNames = folderNames.filter(function(folderName) {
	    return folderName.startsWith("20");
	});

    folderNames.sort(function(a, b) { // 降順に並べ替える

    return b.substring(0, 12).localeCompare(
        a.substring(0, 12)
    );

    });

    // ==================================================
    // Flickrのcollection.set と同じような処理
    // ==================================================

    var count = 0;

    var totalSets = folderNames.length;


    $("#record-container").html("");


    // 以前のデータをクリア
    shellPhotos = [];

    flickrPhotoset = [];

    recordSets = [];


    $.each(folderNames, function(index, folderName) {


        // ----------------------------------------------
        // 表示用ID
        // ----------------------------------------------

        var idSetInfo =
            "setInfo0" + String(10000 + index);

        var idPhotos =
            "photos0" + String(10000 + index);


        $("#record-container")

            .append(
                $("<div/>")
                    .attr({id: idSetInfo})
                    .addClass("record-place")
            )

            .append(
                $("<ul/>")
                    .attr({id: idPhotos})
                    .addClass("record-photoset clearfix")
            );


        // ----------------------------------------------
        // FlickrPhotosetを作る
        // ----------------------------------------------

        flickrPhotoset[index] = new FlickrPhotoset({

            localMode: true,

            localFiles: folders[folderName],

            localTitle: folderName,

            localDescription: ""
        });


        // ----------------------------------------------
        // Set情報取得
        // ----------------------------------------------
//console.log(flickrPhotoset[index]); 
        flickrPhotoset[index].getInfo(function() {

//console.log(flickrPhotoset[index]); 
            recordSets[index] = {

                title:
                    flickrPhotoset[index]
                        .infoData
                        .photoset
                        .title
                        ._content,

                description:
                    flickrPhotoset[index]
                        .infoData
                        .photoset
                        .description
                        ._content
                        .replace(/\n/g, "<br/>")
            };

			var set_title = recordSets[index].title.slice(0,10) + recordSets[index].title.slice(12)
            $("#" + idSetInfo).html(

                $("<h2/>")
                    .html(set_title)

            ).append(

                $("<p/>")
                    .html(recordSets[index].description)

            );
//console.log(set_title,recordSets[index].description);  // NG
//console.log(flickrPhotoset[index]); // NG
        });

        // ----------------------------------------------
        // 写真取得
        // ----------------------------------------------

        flickrPhotoset[index].getPhotos(function() {

            count++;
//console.log(flickrPhotoset[index]);

            var list =
                flickrPhotoset[index]
                    .photosData
                    .photoset
                    .photo;

		    flickrPhotoset[index].photosData.photoset.photo =
		        list.filter(function(photo) {
		            return !photo.title.startsWith("20");
		        });
			list = flickrPhotoset[index].photosData.photoset.photo;

            $.each(list, function(i, photo) {


                // --------------------------------------
                // 既存プログラムと同じ情報を追加
                // --------------------------------------

                photo.mainOrder = index;

                photo.subOrder = i;

                photo.place =
                    flickrPhotoset[index]
                        .infoData
                        .photoset
                        .title._content.slice(12);


                shellPhotos.push(photo);


				if (!photo.datetaken) { photo.datetaken = photo.folderName.substr(0, 10) }

                // --------------------------------------
                // 現在使っているタイトル処理
                // --------------------------------------

                if (photo.title) {

                    var photo_title = photo.title;


                    if (
                        photo.title.charAt(0) == "1" ||
                        photo.title.charAt(0) == "2"
                    ) {

                        if (
                            photo.title.indexOf(" ") != -1
                        ) {

                            photo_title =
                                photo.title.substr(
                                    photo.title.lastIndexOf(" ") + 1,
                                    photo.title.length
                                );

                        } else {

                            photo_title =
                                photo.title.substr(
                                    15,
                                    photo.title.length
                                );
                        }
                    }

                    flickrPhotoset[index]
                        .photosData
                        .photoset
                        .photo[i]
                        .title = photo_title.match(/[ァ-ヶー]+/g);
                }

            });

            // ----------------------------------------------
            // 全setの読み込み完了
            // ----------------------------------------------

            if (count == totalSets) {


		flickrPhotoset = flickrPhotoset.filter(function(photoset) {
		    return photoset.localTitle.startsWith("20");
		});

                $("#photo-to-map")
                    .css({display: "block"})
                    .off("click")
                    .on("click", function() {

                        switch ($(this).text()) {

                            case "図鑑":

                                $("#record-container")
                                    .css({display: "none"});

                                $("#book-container")
                                    .css({display: "block"});

                                $(this).text("記録");

                                isRecord = false;

                                window.dispatchEvent(event);

                                break;


                            case "記録":

                                $("#record-container")
                                    .css({display: "block"});

                                $("#book-container")
                                    .css({display: "none"});

                                $(this).text("図鑑");

                                isRecord = true;

                                break;
                        }

                    });

                // ------------------------------------------
                // 元の処理をそのまま実行
                // ------------------------------------------

                record();

                pictureBook();


                // 手動でスクロールイベント
                window.dispatchEvent(event);

            }

        });

    });

}







	function pictureBook(){

		var defaults = {
			liCSS: {
				float: "left",
				display: "block"
			},
			imgSuffix: "_o",
			imgRatio: imgRatio_,  // 2026-04-12 修正
			mapClass: "book-mapClass",
			dateClass: "book-dateClass",
			imgClass: "book-imgClass",
			titleClass: "book-titleClass",
			captionClass: "book-captionClass",
			arrowSetting: {
				image: new google.maps.MarkerImage( // 写真の座標を示す矢印の画像
				"http://www.google.com/mapfiles/gadget/arrowSmall80.png",
		    	new google.maps.Size(27, 31), // size
		    	new google.maps.Point(0,0), // origin
		    	new google.maps.Point(10, 60) // anchor
			),
			animation: google.maps.Animation.BOUNCE
		},
		modalSize: {
			width: "80%",
			height: "80%"
		},
		};
		var prms = $.extend( {}, defaults );

		$.each(SHELLS, function(index,item){

			shellsPhotoset[index] = shellPhotos.filter( function (shellPhoto) {
				return shellPhoto.title == SHELLS[index].title;
			});
			shellsPhotoset[index].sort(function(a,b){ // 日付の降順でソート
			    if(a.datetaken > b.datetaken) return -1;
			    if(a.datetaken < b.datetaken) return 1;
			    return 0;
			});

			var idSetInfo = "setInfo2" + String(10000+index);
			var id = "photos2" + String(10000+index);
			$("#book-container").append($("<div/>").attr({id: idSetInfo}).addClass("book-name"))
				.append($("<ul/>").attr({id: id}).addClass("book-photoset clearfix"));

	        $("#"+idSetInfo).html(
	            $('<h2/>').html(SHELLS[index].title)
	        ).append(
	            $('<p/>').html(SHELLS[index].description)
	        );
			if (shellsPhotoset[index].length > 0 ) {
				id = "#"+id;
				var $contents = $(id).html("");
				var photoWidth = [];
				var photoHeight = [];
				var $liPhoto = [];

				photoImageActive2[index] = false;
				photoImage2[index] = new ImageLoader();
			    for( var i=0; i<shellsPhotoset[index].length; i++ ) {

			        var photo = shellsPhotoset[index][i];
					var imgSuffix = prms.imgSuffix;
					if ( screen.width > 1024 ) {
						if ( Number(photo.o_width)/Number(photo.o_height) >= 2.0 ) {
							//if ( prms.imgSuffix == "" ) imgSuffix = "_b";
							//if ( prms.imgSuffix == "_n" ) imgSuffix = "_c";
						}
					}
		
					photoImage2[index].add(photo.localUrl);
		
				}
	
			}
		});

	};


	function modalResize($element){ // モーダルコンテンツの表示位置を設定する関数
	
		var w = $(window).width(); // ウィンドウの横幅を取得
		var h = $(window).height(); // ウィンドウの高さを取得
		var width = $element.outerWidth(true);
		var height = $element.outerHeight(true);
		var aspect = height / width;

		if ( width > w ) {
			width = w * 0.9;
			height = width * aspect;
		}
		if ( height > h ) {
			height = h * 0.9;
			width = height / aspect;
		}

		var x = (w - width) / 2; // モーダルコンテンツの表示位置を取得
		var y = (h - height) / 2; // モーダルコンテンツの表示位置を取得
		$element.css({ // モーダルコンテンツの表示位置を設定
			'position': 'fixed',
			'left': x + 'px',
			'top': y + 'px',
		});

		$element.find(".shell-img").css({
			"width" : width + "px",
			"height" : height + "px"
		});

	}

var Group = function ( map, list, iconImage ) {

		var pLatLng = [];
		this.group = [];

		for (var i = 0; i < list.length; i++) {

	    	var photo = list[i];
	
			var myLat = photo.latitude;
			var myLng = photo.longitude;
			pLatLng[i] = myLat + ',' + myLng;
	
			var marker = null;
			if (!this.group[pLatLng[i]]) {
				this.group[pLatLng[i]] = [];
				var marker = new google.maps.Marker({
		    	position: new google.maps.LatLng(Number(myLat),Number(myLng)),
		      	map: map,
				animation: null,
				icon: iconImage,
				zIndex: 99
		    });

			var $content = $('<a/>').css({
				fontWeight: "bold",
				fontSize: "14px",
				fontFamily: "arial, sans-serif"
					}).text(photo.place);
			var marker_title = new GMOverlayHtml({
						map: map, 
						position: new google.maps.LatLng(Number(myLat),Number(myLng)),
						offsetX: 10,
						offsetY: -14,
						content: $content[0].outerHTML,
					})
    		marker_title.setMap(map);

			}

			var jpg_suffix = "";
			if(navigator.userAgent.match(/(iPhone|iPod|Android)/i)){ // iPhone等の場合のみ処理 2019-09-20
				jpg_suffix = "_n";
			}
			this.group[pLatLng[i]].push({
				src: 'https://live.staticflickr.com/'
					+photo.server+'/'+photo.id+'_'+photo.secret+jpg_suffix+'.jpg',
				thum: 'https://live.staticflickr.com/'
					+photo.server+'/'+photo.id+'_'+photo.secret+'_t.jpg',
				marker: marker,
				title: photo.title
			});


		}

}

	function record(){

		var defaults = {
			liCSS: {
				float: "left",
				display: "block"
			},
			imgSuffix: "_o",
			imgRatio: imgRatio_,  // 2026-04-12 修正
			mapClass: "book-mapClass",
			dateClass: "book-dateClass",
			imgClass: "book-imgClass",
			titleClass: "book-titleClass",
			captionClass: "book-captionClass",
			arrowSetting: {
				image: new google.maps.MarkerImage( // 写真の座標を示す矢印の画像
					"http://www.google.com/mapfiles/gadget/arrowSmall80.png",
			    	new google.maps.Size(27, 31), // size
			    	new google.maps.Point(0,0), // origin
			    	new google.maps.Point(10, 60) // anchor
				),
				animation: google.maps.Animation.BOUNCE
			},
			modalSize: {
				width: "80%",
				height: "80%"
			},
		};
		var prms = $.extend( {}, defaults );
		$.each(recordSets, function(index,item){
			recordPhotoset[index] = shellPhotos.filter( function (shellPhoto) {
				return shellPhoto.mainOrder == index;
			});

			recordPhotoset[index].sort(function(x,y){
				return SHELLS.findIndex(({title}) => title === x.title) - SHELLS.findIndex(({title}) => title === y.title);
			});	

			var idSetInfo = "setInfo0" + String(10000+index);
			var id = "photos0" + String(10000+index);

			if (recordPhotoset[index].length > 0 ) {

				id = "#"+id;
				var $contents = $(id).html("");

				photoImageActive[index] = false;
				photoImage[index] = new ImageLoader();

			    for( var i=0; i<recordPhotoset[index].length; i++ ) {

			        var photo = recordPhotoset[index][i];

					var imgSuffix = prms.imgSuffix;
					if ( screen.width > 1024 ) {
						if ( Number(photo.o_width)/Number(photo.o_height) >= 2.0 ) {
							//if ( prms.imgSuffix == "" ) imgSuffix = "_b";
							//if ( prms.imgSuffix == "_n" ) imgSuffix = "_c";
						}
					}
		
					photoImage[index].add(photo.localUrl);
		
				}

			}

		});
	};

		var timer;
		$(window).scroll(function(){
			var defaults = {
				liCSS: {
					float: "left",
					display: "block"
				},
				imgSuffix: "_o",
				imgRatio: imgRatio_,  // 2026-04-12 修正
				mapClass: "book-mapClass",
				dateClass: "book-dateClass",
				imgClass: "book-imgClass",
				titleClass: "book-titleClass",
				captionClass: "book-captionClass",
				arrowSetting: {
					image: new google.maps.MarkerImage( // 写真の座標を示す矢印の画像
						"http://www.google.com/mapfiles/gadget/arrowSmall80.png",
				    	new google.maps.Size(27, 31), // size
				    	new google.maps.Point(0,0), // origin
				    	new google.maps.Point(10, 60) // anchor
					),
					animation: google.maps.Animation.BOUNCE
				},
				modalSize: {
					width: "80%",
					height: "80%"
				},
			};
			var prms = $.extend( {}, defaults );
	
					var photoWidth = [];
					var photoHeight = [];
					var $liPhoto = [];

			clearTimeout(timer);
			timer = setTimeout( function(){

			if ( isRecord == true ) {

				$("#record-container").find(".record-photoset").each( function(index, e) {

					var elemOffset = Number( $(this).offset().top );
					var scrollPos = Number( $(window).scrollTop() );
					var wh = Number( $(window).height() );

			    	if(  scrollPos < elemOffset && elemOffset < scrollPos + wh &&  photoImageActive[index] == false ){

						var $contents = $("#"+$(this).attr("id"))
						photoImage[index].start();
						photoImage[index].onLoaded = function() {
							$("#showImgSequence-loading-image").fadeOut(1000).remove();
						}
						photoImageActive[index] = true;
						var photoIndex = 0;
						photoImage[index].onPprogress = function(event) {
		
							var img = event.data;
							img.width = img.width * parseFloat(prms.imgRatio);  // 2021-11-07 追加
							img.height = img.height * parseFloat(prms.imgRatio);  // 2021-11-07 追加
							photoWidth[photoIndex] = img.width;
							photoHeight[photoIndex] = img.height;
		
					        var photo = recordPhotoset[index][photoIndex];
				
							$liPhoto[photoIndex] = $('<li/>')
				            .css(prms.liCSS);
		/*
							//  地図
							if ( photo.latitude != 0 ) { 
								var $map = $('<a/>', { 
									text: 'map',
								})
				                .addClass(prms.mapClass)
				                .addClass('modal').attr("data-mylat", photo.latitude).attr("data-mylng", photo.longitude)
								.on( "click", function(){ // クリックで地図を表示
		
									$overlay = $('<div/>').css({
												position: 'fixed', top: '0', left: '0',
												width: '100%', height: '100%',
												backgroundColor: 'black', opacity: '0.75'
									}).appendTo("body");
									var $modal = $("<div/>").attr({id: 'mapModal'}).css({
										display: 'none',
										position: 'fixed', top: '0', left: '0',
										width: prms.modalSize.width, height: prms.modalSize.height,
										backgroundColor: 'white', opacity: '1.0'
									}).appendTo("body").fadeIn('slow');
									var $modal_map = $("<div/>").attr({id: 'mapModal_map'}).css({
										position: 'relatice', top: '0', left: '0',
										width: '100%', height: '100%',
										backgroundColor: 'white', opacity: '1.0'
									}).appendTo($modal);
		
									var gm = new GmLayout( "#mapModal_map", recordPhotoset[index] )
		
									var map = new google.maps.Map( document.getElementById('mapModal_map'),{
								    	zoom: gm.zoom,
								    	center: gm.ctr,
								      	mapTypeId: google.maps.MapTypeId.ROADMAP,
										gestureHandling: "greedy"
									});
		
									var image = new google.maps.MarkerImage('http://s10-4bn.sunnyday.jp/_icon/shell.png',
							      		new google.maps.Size(32,32), // size
							      		new google.maps.Point(0,0), // origin
							      		new google.maps.Point(17, 32)); // anchor
									var pg = new Group ( map, recordPhotoset[index], image );
		
									var latlng = new google.maps.LatLng(Number($(this).data("mylat")),Number($(this).data("mylng")));
						
									var marker = new google.maps.Marker({
								    	position: latlng,
								      	map: map,
										animation: prms.arrowSetting.animation,
										icon: prms.arrowSetting.image
								    });
		
									modalResize($modal); 
		
									$overlay.off().click(function(){
								    	$modal.fadeOut('slow',function(){
											$modal.remove();
										});
										$overlay.fadeOut('slow',function(){
											$overlay.remove();
										});
									});
		
								})
		
								$liPhoto[photoIndex].append($map);
				
							}
		*/
							// 日付
		/*					var $date = $('<div/>', { text: photo.datetaken.substr(0,10) } )
				                .addClass(prms.dateClass);
		*/
							var $date = $('<div/>', "" )
				                .addClass(prms.dateClass);
							// 画像
							var $img = $('<img/>', { 
								src: photoImage[index].imageList[photoIndex],
								width: img.width
							}).addClass(prms.imgClass).on( "click", function(){ // クリックで拡大表示
		
								currentScrollTop = $(window).scrollTop();
				
									$overlay = $('<div/>').css({
												position: 'fixed', top: '0', left: '0',
												width: '100%', height: '100%',
												backgroundColor: 'black', opacity: '0.75'
									}).appendTo("body");
									var $modal = $("<div/>").appendTo("body");
		
									$div = 	
										$("<div/>").css({
												position: 'fixed', top: '0', left: '0',
												backgroundColor: 'black', opacity: '0.0'
										}).append(
											$('<img src = ' + this.src +'>').addClass("shell-img"));
		
									$('<img src="http://s10-4bn.sunnyday.jp/_icon/close.png">').css({
											position: "absolute", top: '0', right: '0px',
											margin: "0px", padding: "0px",
											cursor: "pointer"
									}).on("click",function(){
								    	$modal.fadeOut('slow',function(){
											$modal.remove();
										});
										$overlay.fadeOut('slow',function(){
											$overlay.remove();
										});
									}).appendTo($div);
		
									$div.appendTo($modal);
		
									$div.find("img").on("load", function(){
										$(this).find("img").off("load");
										modalResize($(this).parent());
									});
		
									$modal.find("img").on("load", function(){
										$div.css({opacity: 1.0})
										$modal.css({opacity: 0.0}).addClass('active')
												.animate({opacity: 1.0}, 1000).css({zIndex: 2});
									});
		
					
									$overlay.off().click(function(){
								    	$modal.fadeOut('slow',function(){
											$modal.remove();
										});
										$overlay.fadeOut('slow',function(){
											$overlay.remove();
										});
									});
				
							});
		
							$liPhoto[photoIndex].append($date).append($img);
				
							if (photo.title)	{
								var $photoTitle = $('<div/>', { text: photo.title })
				                    .addClass(prms.titleClass);
								$liPhoto[photoIndex].append($photoTitle);
							}
		
							if (photo.description._content){
								var $photoCaption = $("<div>" + photo.description._content.replace(/\n/g,"<br/>") + "</div>").addClass(prms.captionClass);
								$liPhoto[photoIndex].append($photoCaption);
							}
		
				            $liPhoto[photoIndex].append("<br/>");
							$contents.append($liPhoto[photoIndex]);
		
							var id = "photos0" + String(10000+index);

							photoIndex++;
				
						}
		
				        $contents.after("<div style='clear: both;'></div>");

			    	}

				});

			}
	
			else {

				$("#book-container").find(".book-photoset").each( function(index, e) {

					var elemOffset = Number( $(this).offset().top );
					var scrollPos = Number( $(window).scrollTop() );
					var wh = Number( $(window).height() );

			    	if(  scrollPos < elemOffset && elemOffset < scrollPos + wh &&  photoImageActive2[index] == false ){

						photoImageActive2[index] = true;
						var $contents = $("#"+$(this).attr("id"))
						photoImage2[index].start();
						photoImage2[index].onLoaded = function() {
							$("#showImgSequence-loading-image").fadeOut(1000).remove();
						}
				
						var photoIndex2 = 0;
						photoImage2[index].onPprogress = function(event) {
		
							var img = event.data;
							img.width = img.width * parseFloat(prms.imgRatio);  // 2021-11-07 追加
							img.height = img.height * parseFloat(prms.imgRatio);  // 2021-11-07 追加
							photoWidth[photoIndex2] = img.width;
							photoHeight[photoIndex2] = img.height;
		
					        var photo = shellsPhotoset[index][photoIndex2];
				
							$liPhoto[photoIndex2] = $('<li/>')
				            .css(prms.liCSS);
		
							//  地図
							if ( photo.latitude != 0 ) { 
								var $map = $('<a/>', { 
									text: 'map',
								})
				                .addClass(prms.mapClass)
				                .addClass('modal').attr("data-mylat", photo.latitude).attr("data-mylng", photo.longitude)
								.on( "click", function(){ // クリックで地図を表示
									$overlay = $('<div/>').css({
												position: 'fixed', top: '0', left: '0',
												width: '100%', height: '100%',
												backgroundColor: 'black', opacity: '0.75'
									}).appendTo("body");
									var $modal = $("<div/>").attr({id: 'mapModal'}).css({
										display: 'none',
										position: 'fixed', top: '0', left: '0',
										width: prms.modalSize.width, height: prms.modalSize.height,
										backgroundColor: 'white', opacity: '1.0'
									}).appendTo("body").fadeIn('slow');
									var $modal_map = $("<div/>").attr({id: 'mapModal_map'}).css({
										position: 'relatice', top: '0', left: '0',
										width: '100%', height: '100%',
										backgroundColor: 'white', opacity: '1.0'
									}).appendTo($modal);
		
									var gm = new GmLayout( "#mapModal_map", shellsPhotoset[index] )
		
									var map = new google.maps.Map( document.getElementById('mapModal_map'),{
								    	zoom: gm.zoom,
								    	center: gm.ctr,
								      	mapTypeId: google.maps.MapTypeId.ROADMAP,
										gestureHandling: "greedy"
									});
		
									var image = new google.maps.MarkerImage('http://s10-4bn.sunnyday.jp/_icon/shell.png',
							      		new google.maps.Size(32,32), // size
							      		new google.maps.Point(0,0), // origin
							      		new google.maps.Point(17, 32)); // anchor
		
									var pg = new Group ( map, shellsPhotoset[index], image );
		
									var latlng = new google.maps.LatLng(Number($(this).data("mylat")),Number($(this).data("mylng")));
						
									var marker = new google.maps.Marker({
								    	position: latlng,
								      	map: map,
										animation: prms.arrowSetting.animation,
										icon: prms.arrowSetting.image
								    });
		
									modalResize($modal); 
		
									$overlay.off().click(function(){
								    	$modal.fadeOut('slow',function(){
											$modal.remove();
										});
										$overlay.fadeOut('slow',function(){
											$overlay.remove();
										});
									});
		
								})
		
								$liPhoto[photoIndex2].append($map);
				
							}
				
							// 日付
							var $date = $('<div/>', { text: photo.datetaken.substr(0,10) } )
				                .addClass(prms.dateClass);
		
							// 画像
							var $img = $('<img/>', { 
								src: photoImage2[index].imageList[photoIndex2],
								width: img.width
							}).addClass(prms.imgClass).on( "click", function(){ // クリックで拡大表示
		
								currentScrollTop = $(window).scrollTop();
				
									$overlay = $('<div/>').css({
												position: 'fixed', top: '0', left: '0',
												width: '100%', height: '100%',
												backgroundColor: 'black', opacity: '0.75'
									}).appendTo("body");
									var $modal = $("<div/>").appendTo("body");
		
									$div = 	
										$("<div/>").css({
												position: 'fixed', top: '0', left: '0',
												backgroundColor: 'black', opacity: '0.0'
										}).append(
											$('<img src = ' + this.src +'>').addClass("shell-img"));
		
									$('<img src="http://s10-4bn.sunnyday.jp/_icon/close.png">').css({
											position: "absolute", top: '0', right: '0px',
											margin: "0px", padding: "0px",
											cursor: "pointer"
									}).on("click",function(){
								    	$modal.fadeOut('slow',function(){
											$modal.remove();
										});
										$overlay.fadeOut('slow',function(){
											$overlay.remove();
										});
									}).appendTo($div);
		
									$div.appendTo($modal);
		
									$div.find("img").on("load", function(){
										$(this).find("img").off("load");
										modalResize($(this).parent());
									});
		
									$modal.find("img").on("load", function(){
										$div.css({opacity: 1.0})
										$modal.css({opacity: 0.0}).addClass('active')
												.animate({opacity: 1.0}, 1000).css({zIndex: 2});
									});
		
					
									$overlay.off().click(function(){
								    	$modal.fadeOut('slow',function(){
											$modal.remove();
										});
										$overlay.fadeOut('slow',function(){
											$overlay.remove();
										});
									});
				
							});
		
							$liPhoto[photoIndex2].append($date).append($img);
				
							if (photo.place)	{
								var $photoTitle = $('<div></div>', { text: photo.place })
				                    .addClass(prms.titleClass);
								$liPhoto[photoIndex2].append($photoTitle);
							}
		
							if (photo.description._content){
								var $photoCaption = $("<div>" + photo.description._content.replace(/\n/g,"<br/>") + "</div>").addClass(prms.captionClass);
								$liPhoto[photoIndex2].append($photoCaption);
							}
		
				            $liPhoto[photoIndex2].append("<br/>");
							$contents.append($liPhoto[photoIndex2]);
				
							photoIndex2++;
				
						}
				
				        $contents.after("<div style='clear: both;'></div>");

					}
				});

      }

			},100);

		});

});

})(jQuery); 

