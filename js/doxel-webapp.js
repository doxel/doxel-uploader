/*
 * doxel-webapp.js
 *
 * Copyright (c) 2015-2016 ALSENET SA - http://doxel.org
 * Please read <http://doxel.org/license> for more information.
 *
 * Author(s):
 *
 *      Rurik Bogdanov <rurik.bugdanov@alsenet.com>
 *
 * This file is part of the DOXEL project <http://doxel.org>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Additional Terms:
 *
 *      You are required to preserve legal notices and author attributions in
 *      that material or in the Appropriate Legal Notices displayed by works
 *      containing it.
 *
 *      You are required to attribute the work as explained in the "Usage and
 *      Attribution" section of <http://doxel.org/license>.
 */

var disable_fileUpdate=false;

window.onbeforeunload = function() {
  if (!window.UPLOADING) {
    return null;
  }
  setTimeout(function(){
    plupload.uploader.stop();
    setTimeout(function(){
      plupload.uploader.start();
    });
  });
  return "Cancel the current upload ?";
}

window.alert=function(message){
  window.top.alert(message);
  return;
  console.trace('alert');
  return $.notify({
    message: message
  },  {
    newest_on_top: true,
  });
}

$(document).ready(function(){
    webapp.init();
});

/**
* @object views
*
* View instances
*/
var views={

  /**
   * @property views.termsAndConditions
   *
   * Display termsAndConditions
   * user must agree to continue
   *
   * @event {agree} the user agreed
   *
   */
  termsAndConditions: new View({

    url: 'view/termsAndConditions.html',
    container: 'div#termsAndConditions',
    className: 'termsAndConditions',

    /**
     * @method views.termsAndConditions.onload
     */
    onload: function views_termsAndConditions_onload() {
      var view=this;
      view.setupEventHandlers();
      $(view).trigger('ready');

    }, // views.termsAndConditions.onload

    /**
     * @method views.termsAndConditions.setupEventHandlers
     */
    setupEventHandlers: function views_termsAndConditions_setupEventHandlers(){

      var view=this;

      view.getElem().on('click','.button',function(e) {
        view.buttonClick(e);
      });;

    }, // views.termsAndConditions.setupEventHandlers

    /**
     * @method views.termsAndConditions.buttonClick
     */
    buttonClick: function views_termsAndConditions_buttonClick(e){

      // the only way out of this view is clicking on agree
      if ($(e.target).hasClass('agree')) {
        $(views.termsAndConditions.container).remove();
        $(views.termsAndConditions).trigger('agree');
      }

    } // views.termsAndConditions.setupEventHandlers

  }), // views.termsAndConditions

  /**
   * @property views.plupload
   *
   * view where the user can add the photos to upload
   * and where the thumbnail list is displayed using plupload
   *
   */
  plupload: new View({

    /**
    * @property views.plupload.url
    */
    url: 'view/plupload.html',

    /**
    * @property views.plupload.container
    */
    container: 'div#plupload',

    /**
    * @property views.plupload.already_checked_for_camera_in_sensor_database
    */
    already_checked_for_camera_in_sensor_database: {},

    /**
    * @property views.plupload.uploaderEvents
    *
    * see plupload source code for uploader events documentation
    *
    */
    uploaderEvents: {

      /**
      * @method views.plupload.uploaderEvents.Error
      *
      */
      Error: function views_plupload_uploaderEvents_Error(uploader,error){
        if (error.code!=-602) { // no alert here on client side duplicate file error

            if (error.response && String(error.response).match('jsonrpc')) {
              var response=JSON.parse(error.response);

              if (response.error) {

                if (response.error.original) {
                  console.log(response.error.original);

                  // no alert on server side duplicate file error
                  if (response.error.original.error.code==904) {
                    ++uploader.file_duplicate_count;
                    return;
                  }

                }

                alert(response.error.message);
                uploader.stop();

              } else {
                console.log(arguments);
                alert('Internal server error !');
              }

            } else {
              console.log(arguments);
              alert(error.message);
              uploader.stop();
            }
        }
      },

      /**
      * @method views.plupload.uploaderEvents.browse
      *
      */
      Browse: function views_plupload_uploaderEvents_browse(uploader){
        uploader.file_duplicate_count=0;
      },

      /**
      * @method views.plupload.uploaderEvents.FilesAdded
      *
      */
      FilesAdded: function views_plupload_uploaderEvents_filesAdded(uploader,files){
        if (uploader.file_duplicate_count && uploader.state==plupload.STOPPED) {
            alert(uploader.file_duplicate_count+' duplicate file'+((uploader.file_duplicate_count>1)?'s were':' was')+' discarded.');
            uploader.file_duplicate_count=0;
        }
      },

      /**
      * @method views.plupload.uploaderEvents.QueueChanged
      *
      * @param {Object} [uploader]
      */
      QueueChanged: function views_plupload_uploaderEvents_QueueChanged(uploader) {

        // update buttons on QueueChanged
        setTimeout(function(){
          plupload.calc();
          views.plupload.updateButtons();
        },0);

      }, // views_plupload_uploaderEvents.QueueChanged

      /**
      * @method views.plupload.uploaderEvents.updatebuttons
      *
      * @param {Object} [uploader]
      */
      updatebuttons: function views_plupload_uploaderEvents_updatebuttons(uploader) {

        setTimeout(function(){
          plupload.calc();
          views.plupload.updateButtons();
        },0)

      }, // views_plupload_uploaderEvents.updatebuttons

      /**
      * @method views.plupload.uploaderEvents.StateChanged
      *
      * @param {Object} [uploader]
      */
      StateChanged: function views_plupload_uploaderEvents_StateChanged(uploader) {

        switch (uploader.state) {
            case plupload.STARTED:
                window.UPLOADING=true;
                // hide buttons during upload
                $('.plupload_buttons .ui-widget', views.plupload.container).css('visibility','hidden');
                break;

            case plupload.STOPPED:
                window.UPLOADING=false;
                // show buttons hidden during upload
                $('.plupload_buttons .ui-widget', views.plupload.container).css('visibility','visible');

                if (uploader.file_duplicate_count) {
                    alert(uploader.file_duplicate_count+' duplicate file'+((uploader.file_duplicate_count>1)?'s were':' was')+' discarded by server.');
                    uploader.file_duplicate_count=0;
                }

                $(views.plupload.container).trigger('lazyload');
        }

      }, // views.plupload.uploaderEvents.StateChanged

      /**
      * @method views.plupload.uploaderEvents.CancelUpload
      *
      * plupload CancelUpload event handler
      *
      * @param {Object} [uploader]
      */
      CancelUpload: function views_plupload_uploaderEvents_CancelUpload(uploader){

        // requeue files not uploaded
        views.plupload.requeueFilesWithStatus(plupload.FAILED,plupload.STARTED,plupload.UPLOADING);

        // exclude uploaded files from calculations
        views.plupload.updateQueue();

        // update counters
        plupload.calc();

        // update buttons
        views.plupload.updateButtons();

      }, // views.plupload.uploaderEvents.CancelUpload

      /**
      * @method views.plupload.uploaderEvents.UploadFile
      *
      * plupload UploadFile event handler
      *
      * @param {Object} [uploader]
      * @param {Object} [file]
      */
      UploadFile: function views_plupload_uploaderEvents_UploadFile(uploader,file) {

        // set default timestamp to file modification date
        var _file=file.getNative();
        // TODO: Date() should come from the server
        var timestamp=String(_file.lastModified || (_file.lastModifiedDate && _file.lastModifiedDate.getTime()) || (new Date()).getTime()).replace(/([0-9]{10})/,'$1_')+'000';

        // try to extract timestamp and GPS coordinates from EXIF
        loadImage.parseMetaData(

          // File object
          file.getNative(),

          // parseMetadata callback
          function(data){
            var date_str;
            var subSec;
            var lon,lat;

            if (data && data.exif) {

              // try to get date from EXIF
              try {
                date_str=data.exif.get('DateTimeOriginal');
                subSec=data.exif.get('SubSecTimeOriginal');

              } catch(e) {
                console.log(e);
              }

              if (date_str) {

                // try to convert date to numerical timestamp
                try {
                  var _timestamp=new Date(date_str.replace(/([0-9]{4}):([0-9]{2}):([0-9]{2})/,"$1/$2/$3")).getTime();

                  if (isNaN(_timestamp)) {
                     _timestamp=new Date(date_str.replace(/([0-9]{4}):([0-9]{2}):([0-9]{2})/,"$1-$2-$3")).getTime();
                  }

                  if (isNaN(_timestamp)) {
                    if (!window.invalidTimestamp) {
                      alert('Could not convert EXIF timestamp. Other occurences will be ignored.');
                      window.invalidTimestamp=true;
                    }

                  } else {

                    if (subSec) {
                      timestamp=String(_timestamp).substr(0,10)+'_'+subSec.trim().substr(0,6);
                      while(timestamp.length<17) timestamp+='0';

                    } else {
                      timestamp=String(_timestamp).replace(/([0-9]{10})/,'$1_')+'000';

                    }
                  }

                } catch(e) {
                  console.log(date_str,e);
                  alert(e.message);
                }
              }

              console.log(timestamp);

              // get GPS coordinates
              try {
                var dms=data.exif.get('GPSLongitude');
                if (dms) {
                  // convert to decimal
                  lon=parseInt(dms[0])+parseInt(dms[1])/60+parseInt(dms[2])/3600;

                  // set negative value for west coordinate
                  if (data.exif.get('GPSLongitudeRef')=='W') {
                    lon=-Math.abs(lon);
                  }

                }
              } catch(e) {
                console.log(e);
                alert(e.message);
              }

              try {
                var dms=data.exif.get('GPSLatitude');

                if (dms) {
                  // convert to signed decimal
                  lat=parseInt(dms[0])+parseInt(dms[1])/60+parseInt(dms[2])/3600;

                  // set negative value for south coordinate
                  if (data.exif.get('GPSLatitudeRef')=='S') {
                    lat=-Math.abs(lat);
                  }

                }

              } catch(e) {
                console.log(e);
                alert(e.message);
              }

            }

            // insert copyright and compute file hash
            file_update(file.getNative(),function(result){

              if (!result.sha256) {
                alert("Could not compute file hash for "+file.name);
                uploader.stop();
                return;
              }

              $.ajax({
                method: 'POST',
                url: document.location.origin+'/api/Pictures/isHashUnique',
                data: {
                  sha256: result.sha256
                 },

                success: function(json){
                  if (!json.result) {
                    alert('Could not check for file hash uniqueness');
                    uploader.stop();
                    return;

                  } else {
                    if (!json.result.unique) {
                      // increment duplicate count
                      ++uploader.file_duplicate_count;

                      // mark as uploaded
                      file.status=plupload.DONE;

                      // remove DOM element
                      var $file = $('#'+file.id);
                      $file.remove();

                      // upload next
                      setTimeout(function() {
                        plupload.uploadNext.call(uploader);
                      }, 1);

                      return;
                    }
                  }

                  // check only once for brand/model in sensor database
                  var alreadyChecked=views.plupload.already_checked_for_camera_in_sensor_database;
                  var brand=data.exif && data.exif.get('Make');
                  var model=data.exif && data.exif.get('Model');
                  var options={};
                  if (!alreadyChecked[brand+';'+model]) {
                      options.brand=brand;
                      options.model=model;
                  }

                  // set metadata to be uploaded
                  uploader.setOption('multipart_params',$.extend(options,{
                    timestamp: timestamp,
                    lon: lon,
                    lat: lat,
                    sha256: result.sha256
                  }));

                  // update file
                  if (!file.updated) {

                    // convert result.jpeg to ArrayBuffer
                    var buf=new Uint8Array(result.jpeg.length);
                    for (var i=0; i< result.jpeg.length; ++i) {
                      buf[i]=result.jpeg.charCodeAt(i);
                    }

                    // convert ArrayBuffer to Blob
                    var blob=new Blob([buf],{type:'image/jpeg'});
                    blob.name=file.name;

                    // convert to plupload/moxie tainted File
                    var filesAdded=uploader.addFile(blob);
                    var newfile=filesAdded[0];

                    // copy file properties
                    newfile._handleFileStatus=file._handleFileStatus;
                    newfile.status=plupload.UPLOADING;
                    newfile.sha256=result.sha256;

                    // flag file as updated
                    newfile.updated=true;

                    for (var i=0; i<plupload.files.length; ++i) {
                      if (file.id==plupload.files[i].id) {
                        // replace old file entry value in plupload queue
                        plupload.files[i]=newfile;

                        // remove newfile array entry in plupload queue
                        plupload.files.splice(newfile._insertBefore,1);
                        break;
                      }
                    }

                    // replace gui list element
                    $('#'+file.id).replaceWith($('#'+newfile.id));

                    // use newfile instead of original one
                    file=newfile;
                  }

                  try {
                    // start upload
                    plupload.onUploadFile.call(this,uploader,file);

                  } catch(e) {
                    console.log(e);
                    uploader.stop();
                    alert(e.message);
                  }

                },

                error: function(json){
                  if (json.error) {
                    console.log(json.error);
                    alert(json.error.message);

                  } else {
                    alert('Could not check for file hash uniqueness');

                  }
                  uploader.stop();
                }

              }); // hashIsUnique

            });

          },

          // parseMetadata options
          {
             maxMetaDataSize:262144,
             disableImageHead:false
          }

        );

      }, // views.plupload.uploaderEvents.UploadFile

      /**
      * @method views.plupload.uploaderEvents.FileUploaded
      *
      * @param {Object} [uploader]
      * @param {Object} [file]
      * @param {Object} [info]
      */
      FileUploaded: function views_plupload_uploaderEvents_FileUploaded(uploader,file,info){

          var failed;
          var message;

          var $file = $('#'+file.id);

          // get upload.php response
          var response=jQuery.parseJSON(info.response);

          // upload failed
          if (response.error) {

            failed=true;
            message=response.error.message;

            if (response.error.original) {
              console.log(response.error.original);

              if (response.error.original.message.match(/jsonrpc/)) {
                var original=JSON.parse(response.error.original.message);
                message=(original.error && original.error.message) || message

                // no alert on server side duplicate file error
                if (original.error && original.error.code==904) {
                  $file.remove();
                  ++uploader.file_duplicate_count;
                  return;
                }
              }
            }

          } else {

            if (response.result) {

               // remove DOM element after upload
               $file.remove();

              if (response.result.messages) {
                  // TODO: notify instead
                  var m0=response.result.messages[0];
                  alert(m0.message);
                  views.plupload.already_checked_for_camera_in_sensor_database[m0.brand+';'+m0.model]=true;
              }

            } else {
              // upload failed
              failed=true;
              message="A server error occured.";

            }
          }

          if (failed) {
            file.status=plupload.FAILED;
            file._handleFileStatus(file);

            // set file status icon text
            $('.plupload_action_icon',$file).attr('title',message);

            alert(message);
            uploader.stop();
          }

      }, // views.plupload.uploaderEvents.FileUploaded

      /**
      * @method views.plupload.uploaderEvents.UploadComplete
      *
      * @param {Object} [uploader]
      */
      UploadComplete: function views_plupload_uploaderEvents_UploadComplete(uploader) {

        uploader.total.uploaded=0;
        uploader.total.failed=0;
        uploader.total.loaded=0;
        uploader.total.size=0;
        uploader.total.queued=0;

        views.plupload.requeueFilesWithStatus(plupload.FAILED);

        // exclude uploaded files from calculations
        views.plupload.updateQueue();

        plupload.calc();

        views.plupload.updateButtons();

      } // views.plupload.uploaderEvents.UploadComplete

    }, // views.plupload.uploaderEvents

    /**
     * @method views.plupload.onload
     */
    onload: function views_plupload_onload(){

      var view=this;

      view.setupEventHandlers();
      view.setupUploader();

    }, // views.plupload.onload

   /**
   * @method views.plupload.setupUploader
   */
   setupUploader: function views_plupload_setupUploader() {

      var view=this;

      // initialize jquery.plupload
      $(view.container)
      .plupload({

        /**
         * @property jquery.plupload.preinit
         *
         * uploader event handlers
         *
         */
        preinit: view.uploaderEvents,

        /**
        * @method jquery.plupload.init
        *
        * initialize uploader
        *
        */
        init: function(uploader){

          // expose uploader (yeeks)
          plupload.uploader=uploader;

        }, // jquery.plupload.init

       /**
        * @method jquery.plupload.selected
        *
        * select added files
        *
        */
        selected: function(e,o){
            views.plupload.selectFiles(o.files);
        }, // selected

       /**
        * @method jquery.plupload.start
        *
        * uploader is started
        *
        */
        start: function(event,o){
            var uploader=o.up;

            uploader.total.uploaded=0;
            uploader.total.failed=0;
            uploader.total.loaded=0;
            uploader.total.size=0;
            uploader.total.queued=0;

            views.plupload.requeueFilesWithStatus(plupload.FAILED);
            plupload.calc();
            views.plupload.updateButtons();
        },

        /**
        * @method jquery.plupload.updatebuttons
        *
        * update uploader buttons
        *
        */
        updatebuttons: function() {

          clearTimeout(this.updateButtonsTimeout);

          this.updateButtonsTimeout=setTimeout(function(){
              plupload.calc();
              views.plupload.updateButtons();

          },150);

        }, // jquery.plupload.updatebuttons


        // General settings
        runtimes : 'html5,html4',

        // upload script url
        url : '/sendfile',

        // upload chunk size
        chunk_size: '1mb',

        filters : {
          prevent_duplicates: true
        },

        // Rename files by clicking on their titles
        rename: false,

        // Sort files
        sortable: false,

        // Enable ability to drag'n'drop files onto the widget (currently only HTML5 supports that)
        dragdrop: true,

        // Views to activate
        views: {
          list: true,
          thumbs: true, // Show thumbs
          default: 'list'
        }

      });

    }, // views.plupload.setupUploader

    /**
    * @method views.plupload.setupEventHandlers
    */
    setupEventHandlers: function views_plupload_setupEventHandlers() {

      // make files selectable
      $('.plupload_content',views.plupload.container).selectable({
        filter: 'li',
        start: function(){
          views.plupload.updateButtons();
        },
        stop: function() {
          views.plupload.updateButtons();
        }
      });

      // upload cancel button
      $('.plupload_started .cancel',views.plupload.container).on('click', function(){

        var uploader=plupload.uploader;

        uploader.stop();

        uploader.total.uploaded=0;
        uploader.total.failed=0;
        uploader.total.loaded=0;
        uploader.total.size=0;
        uploader.total.queued=0;

        views.plupload.requeueFilesWithStatus(plupload.FAILED);
        plupload.calc();
        views.plupload.updateButtons();

      });

      // trash button
      $('.plupload_buttons .plupload_trash', views.plupload.container).button({
//        icons: { primary: "ui-icon-trash" },
        disabled: true

      }).on('click',function(e){
        var selection=$('.plupload_filelist_content .ui-selected', views.plupload.container);
        if (confirm($(e.target).text()+' from upload queue ?')) {
            views.plupload.removeFilesFromQueue();
        }

      });

      // buttons except view radio buttons
      $('.fa-button').not('.plupload_view_switch label').button();

      // refresh html5 input size on resize
      $(window).on('resize',function(){
        plupload.uploader.refresh();
      });

      $('a.termsAndConditions_link',views.plupload.container).on('click',function(){

        views.plupload.getElem().hide(0);

        views.termsAndConditions.onagree=function(){
          views.plupload.getElem().show(0);
        }
        views.termsAndConditions.show();

      });

    }, // views.plupload.setupEventHandlers

    /**
    * @method views.plupload.updateQueue
    *
    * update queue after upload completed or canceled:
    * keep already uploaded files to detect duplicates,
    * but exclude them from calculations
    *
    */
    updateQueue: function views_plupload_updateQueue() {

      $.each(plupload.files,function(){
        if (this.status==plupload.DONE) {
          this.status=plupload.DONE_BEFORE;
        }
      });

    }, // views_plupload_updateQueue

    /**
    * @method views.plupload.removeFilesFromQueue
    *
    * remove selected files or all
    *
    */
    removeFilesFromQueue: function views_plupload_removeFilesFromQueue() {
      var getFile=plupload.uploader.getFile;
      var removeFile=plupload.uploader.removeFile;
      var selection=$('.plupload_filelist_content .ui-selected', views.plupload.container);
      var files=[];

      if (selection.length) {

        // remove selection from queue

        if (selection.length==1) {
          // get next element
          var next=selection.next();
        }

        // remove selection
        $.each(selection,function(){
          plupload.uploader.removeFile(this.id);
        });

        if (next) {
          // select next element
          next.addClass('ui-selected');
        }

      } else {

        // remove all queued files

        var queued_files=[];

        $.each(plupload.files,function(){
          if (this.status==plupload.QUEUED) {
            queued_files.push(this.id);
          }
        });

        // calling removeFile() in the plupload.files loop above fails
        $.each(queued_files,function(i,id){
          plupload.uploader.removeFile(id);
        });

      }

      plupload.uploader.trigger('lazyload');

    }, // views.plupload.removeFilesFromQueue


    /**
    * @method views.plupload.requeueFilesWithStatus
    *
    * re-queue files with given plupload status
    *
    * @param {Number, ...} [plupload_status, ...]
    *
    */
    requeueFilesWithStatus: function views_plupload_requeueFilesWithStatus() {

      // get argument list array
      var args=Array.prototype.slice.apply(arguments);

      $.each(plupload.files,function(i,file){
           if (file.status!=plupload.DONE && file.status!=plupload.UPLOADING && file.status!=plupload.DONE_BEFORE) {

              if (file.status==plupload.FAILED) {
                // decrement failed count
                --plupload.uploader.total.failed;
              }

              if (file.status!=plupload.QUEUED) {
                file.status=plupload.QUEUED;
                // increment queued count
                ++plupload.uploader.total.queued;
              }

              // reset upload counters
              file.loaded=0;
              file.percent=0;

              if (file._handleFileStatus) {
                file._handleFileStatus(file);
              }
          }
      });

    }, // views.plupload.requeueFilesWithStatus

    /**
    * @method views.plupload.selectFiles
    *
    * select specified files
    *
    * @param {Array} [files] the plupload file list
    *
    */
    selectFiles: function views_plupload_selectFiles(files) {

      var list=[];

      $.each(files,function(i,file){
        list.push('#'+file.id);
      });

      $('.plupload_filelist_content',views.plupload.container)
        .find('.ui-selected')
          .removeClass('ui-selected')
          .end()
        .find(list.join(','))
          .addClass('ui-selected');

    }, // views.plupload.selectFiles


    /**
    * @method views.plupload.updateButtons
    */
    updateButtons: function views_plupload_updateButtons() {

      views.plupload.updateBrowseButton();
      views.plupload.updateStartButton();
      views.plupload.updateTrashButton();

    }, // views.plupload.updateButtons

    /**
    * @method views.plupload.updateBrowseButton
    */
    updateBrowseButton: function views_plupload_updateBrowseButton() {

        if (plupload.uploader.total.queued === 0) {
            $('#plupload_browse .ui-button-text',views.plupload.container).html('Add Files');

        } else {
            $('#plupload_browse .ui-button-text',views.plupload.container).html(plupload.uploader.total.queued+' file'+((plupload.uploader.total.queued>1)?'s':'')+' queued');

        }

    }, // views.plupload.updateBrowseButton

    /**
    * @method views.plupload.updateStartButton
    */
    updateStartButton: function views_plupload_updateStartButton() {
        $('#plupload_start',views.plupload.container).button('option','disabled',(plupload.uploader.total.queued === 0));
    }, // views.plupload.updateStartButton

    /**
    * @method views.plupload.updateTrashButton
    */
    updateTrashButton: function views_plupload_updateTrashButton() {

        // update trash button
        var selection=$('.plupload_filelist_content .ui-selected', views.plupload.container);

        // trash button
        $('.plupload_trash',views.plupload.container)

          // upate trash button text
          .button('option', 'label', (selection.length) ? 'Remove '+selection.length+' file'+((selection.length>1)?'s':'') : 'Remove All' )

          // update trash button visibility
          .button('option','disabled',(plupload.uploader.total.queued==0));

    } // views.plupload.updateTrashButton

  }) // views.plupload

} // views


/**
 * @object webapp
 *
 * main application
 *
 * @event {fingerprint} the fingerprint has been loaded or computed
 * @event {login} it's time to start the login process
 * @event {ready} the webapp is ready
 *
 *
 */
var webapp={

  /**
   * @property webapp.defaults
   */
  defaults: {
    showTermsAndConditions: true,
    cookie_expire: Math.pow(2,31),
    initialView: views.plupload
  },

  /**
   * @method webapp.init
   */
  init: function webapp_init(options) {
    $.extend(true,webapp,webapp.defaults,options);
    $(webapp).trigger('ready');

  }, // webapp.init

  /**
   * @method webapp.onready
   */
  onready: function webapp_onready(){
    // show initial view
    webapp.initialView.show();

  } // webapp.onready

} // webapp

/**
* @function file_hash
* @param {File} file - the file to hash
* @param {Function} callback(reply) - the callback
*   {String} reply.hash - set on success
*   {Exception} reply.error - set on error
*/
function file_hash(file, callback) {

  // setup file reader
  var reader=new FileReader();
  reader.onload=function (e) {

    try {

      var time0=new Date().getTime();
      var sha256=asmCrypto.SHA256.hex(e.target.result);
      var time1=new Date().getTime();

      console.log('sha256: '+(time1-time0));

      callback({
        sha256: sha256

      });

    } catch(e) {
      console.log(e.message);
      callback({
        error: e
      });
    }

  }

  // read file
  reader.readAsArrayBuffer(file);

} // file_hash

function file_update(file,callback) {

  // skip already updated file
  if (file.updated) {
    callback({
      updated: true,
      sha256: file.sha256
    });
    return;
  }

  // setup file reader
  var reader=new FileReader();
  reader.onload=function (e) {

    if (disable_fileUpdate) {
      callback({
        updated: true,
        jpeg: e.target.result,
        sha256: asmCrypto.SHA256.hex(e.target.result)
      });
      return;
    }

    var exif={};
    var exifReader;
    var b64;

//    showtime('load exif',function(){
      try {
        var res = piexif.load(e.target.result);
        exif=res.exif_dict;
        exifReader=res.exifReader;
        b64=res.b64;

      } catch(e) {
        console.log(e);
        exif = null;
      }

//    });
    console.log(exif);

    if (exif) {

      // TODO: date should come from the server
      exif['0th'][piexif.ImageIFD.Copyright]="Copyright (c) "+(new Date()).getFullYear()+" by DOXEL.org at Alsenet SA. CCBY-SA.";

      var jpeg;

      var bytes;
//      showtime('new jpeg',function(){
        try {
          bytes=piexif.dump(exif);
          if (exifReader.app1_segmentIndex===undefined) {
            jpeg=piexif.insert(bytes,exifReader);
          } else {
            jpeg=piexif.replace(bytes,exifReader,b64);
          }

        } catch(err) {
          alert('Could not update exif for '+file.name);
          console.log(err);
          callback({
            jpeg: e.target.result,
            sha256: asmCrypto.SHA256.hex(exifReader.getJpegData())
          });
          return;
        }

  //    });

      // compute sha256 for image data (skip exif)
      var sha256;
//      showtime('sha256',function(){
        sha256=asmCrypto.SHA256.hex(exifReader.getJpegData());
        console.log(sha256);
//      });

      callback({
        jpeg: jpeg,
        sha256: sha256
      });

    } else {
      console.log('no exif !');
      callback({
        jpeg: e.target.result,
        sha256: asmCrypto.SHA256.hex(exifReader.getJpegData())
      });
    }
  }
  reader.readAsBinaryString(file);
}

function showtime(str,func) {
  var time0=new Date().getTime();
  func();
  var time1=new Date().getTime();
  console.log(str+': '+(time1-time0));
}
