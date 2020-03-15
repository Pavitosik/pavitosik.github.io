global.$ = require("jquery");

function displayerror(errortext) {
    if (errortext) {
        $("#generic_error").show("slow");
        $("#generic_error").text(errortext);
    } else
        $("#generic_error").hide("slow");
}

global.getEmails = function () {
    $("#submit").hide("slow");
    $.ajax({
        url: '/userapi/gettempmail',
        method: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify({
            username: $("#username").val(),
            password: $("#password").val(),
        }),
        success: async function (returnData) {
            document.location = "/";
        },
        error: function (xhr, status, error) {
            $("#submit").show("slow");
            $("#polling_email").hide("slow");
            try {
                var res = JSON.parse(xhr.responseText);
                if (res.error)
                    displayerror(res.error);
                else
                    throw new Error("Object does not contain .error!")
            } catch (error) {
                displayerror("Unknown error! Please try again later.");
            }
        }
    })
}