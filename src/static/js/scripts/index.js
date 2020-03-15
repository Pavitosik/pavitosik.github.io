global.$ = require("jquery");
const DOMPurify = require("dompurify");
var settings = require("./settings.js");

var fetch_interval = setInterval(fetchEmails, 5000);

global.setCustomDomain = function () {
    var orig_setting = settings.get("custom_domain");
    var domain = prompt("Enter your custom domain or leave blank to clear", orig_setting ? orig_setting : "");
    if (domain == null || domain == orig_setting)
        return;
    settings.set("custom_domain", domain ? domain : null);
    // Reset and get a new session
    resetSessionClicked();
}

async function init_email_box() {
    var currentEmail = await getSession();
    if (!currentEmail)
        return;
    $("#email_add").text(currentEmail.email);
    $("#progress_email").text(currentEmail.email);
    handleError(false);
    fetchEmails();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

global.backToList = function () {
    $("#email_view").hide("slow");
    $("#email_list").show("slow");
    $("#email_body").html("Loading Contents...");
    $("#email_display_sub").text("...");
    $("#email_display_time").text("...");
}

async function loadEmail(timestamp) {
    $("#email_poll").hide();
    $("#email_load").show();
    return await new Promise(function (resolve, reject) {
        $.ajax({
            url: '/userapi/getemail/' + timestamp,
            method: 'GET',
            success: function (returnData) {
                document.getElementById("email_body").innerHTML = DOMPurify.sanitize(returnData.email);
                $("#email_display_sub").text(returnData.subject);
                $("#email_display_time").text(new Date(returnData.time).toTimeString().split(' ')[0]);
                $("#email_list").hide("slow")
                $("#email_view").show("slow");
                $("#email_poll").show();
                $("#email_load").hide();
            },
            error: function (xhr, status, error) {
                console.error(xhr);
                reject(xhr.responseJSON);
            }
        });
    }).catch(function (error) {
        err = error ? error : true;
        console.log(err);
        $("#email_poll").show();
        $("#email_load").hide();
    });
}

async function handleError(xhr) {
    if (!xhr) {
        $("#email_progressbar").show("slow");
        $("#change_button").addClass("btn-success").removeClass("btn-danger").attr('disabled', false);
        cancopyemail = true;
        return;
    }
    cancopyemail = false;
    console.error(xhr);
    $("#change_button").removeClass("btn-success").addClass("btn-danger").attr('disabled', true);
    $("#email_progressbar").hide("slow");

    // Handle ratelimit
    if (xhr.status == 429) {
        $("#email_add").text("Rate limited! Waiting...");
        return;
    }
    // Handle invalid session
    if (xhr.status == 401) {
        $("#email_add").text("Invalid session! Getting new session...");
        init_email_box();
        return;
    }

    if (xhr.responseJSON) {
        if (xhr.responseJSON.noretry && fetch_interval) {
            clearInterval(fetch_interval);
            fetch_interval = null;
        }
        if (xhr.responseJSON.error) {
            $("#email_add").text(xhr.responseJSON.error);
            return;
        }
        // Do nothing and let the error pass thru to the generic error handler
    }

    // Handle other errors
    $("#email_add").text("Errored! Waiting...");
}

async function fetchEmails() {
    var emails = await getEmails();
    $("#email_table_tbody").empty();
    if (!emails || !emails.length) {
        var nomail = `<tr>
              <td class="no-messages">
              </td>
              <td class="no-messages">
                <p style="color: white">You don't have any messages</p>
              </td>
              <td class="no-messages">
              </td>
            </tr>`
        $("#email_table_tbody").append($(nomail));
        return;
    }
    //loop all the emails
    for (var i in emails) {
        var row = $('<tr class="table-primary"> <th id="from" scope="row"></th> <td id="subject" scope="row"></td> <td id="time" scope="row"></td> </tr>')
        row.children("#from").text(emails[i].from);
        row.children("#subject").text(emails[i].subject);
        row.children("#time").text(new Date(emails[i].time).toTimeString().split(' ')[0]);
        row.click(((time) => {
            return function () {
                loadEmail(time);
            }
        })(emails[i].time))
        $("#email_table_tbody").append(row);
    }
}

global.resetSessionClicked = async function () {
    freezeCopy(true);
    $("#email_add").text("Getting a new Email...");
    $("#progress_email").text("...");
    if (!fetch_interval) {
        fetch_interval = setInterval(fetchEmails, 5000);
    }
    var newSess = await resetSession();
    freezeCopy(false);
    if (!newSess)
        return;
    $("#email_add").text(newSess.email);
    $("#progress_email").text(newSess.email);
    handleError(false);
    fetchEmails();
}

var cancopyemail = false;

function freezeCopy(freeze) {
    if (freeze)
        $("#email_add").width($("#email_add").width());
    else
        $("#email_add").width("max-content");
}

global.copyEmail = async function () {
    if (!cancopyemail)
        return;
    var email = $("#email_add").text();
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val(email).select();
    document.execCommand("copy");
    $temp.remove();
    freezeCopy(true);
    $("#email_add").text("Copied!");
    await sleep(1000);
    $("#email_add").text(email);
    freezeCopy(false);
}

async function resetSession() {
    return await new Promise(function (resolve, reject) {
        $.ajax({
            url: '/userapi/makesession',
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({
                domain: settings.get("custom_domain")
            }),
            success: function (returnData) {
                resolve(returnData);
            },
            error: function (xhr, status, error) {
                handleError(xhr);
                resolve();
            },
            timeout: 4000
        });
    })
}

async function getSession() {
    return await new Promise(function (resolve, reject) {
        $.ajax({
            url: '/userapi/getsession',
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({
                domain: settings.get("custom_domain")
            }),
            success: function (returnData) {
                resolve(returnData);
            },
            error: function (xhr, status, error) {
                handleError(xhr);
                resolve();
            },
            timeout: 4000
        });
    })
}

async function getEmails() {
    return await new Promise(function (resolve, reject) {
        $.ajax({
            url: '/userapi/getemails',
            method: 'GET',
            success: function (returnData) {
                handleError(false);
                resolve(returnData);
            },
            error: function (xhr, status, error) {
                handleError(xhr);
                resolve();
            },
            timeout: 4000
        });
    })
}

init_email_box();