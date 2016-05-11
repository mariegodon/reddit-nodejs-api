//make sure can only be sent if all input fields have text
/* global $*/
$(document).ready(function() {
    
    //form validation, disable submit button if empty fields
    $(':text, :password, textarea').on('keyup', function(){
        var empty = false;
        $(':text, :password, textarea').each(function(){
            if($(this).val().length === 0) {
                empty = true;
            }
        })
        if (empty) {
            $('.submit').prop('disabled', true)
        } else {
            $('.submit').prop('disabled', false) 
        }
    })

    //antenna animation 
    //smoothly end animation on mouseoff of header
    $('.header').hover(function() {
        //account for race condition
        if ($('#antenna').hasClass('isAnimated')) {
            $('#antenna').one('animationiteration', function() {
                $('#antenna').addClass('isAnimated');
            });
        }
        else {
            $('#antenna').addClass('isAnimated');
        }

    }, function() {
        $('#antenna').one('animationiteration', function() {
            $('#antenna').removeClass('isAnimated')
        })
    })

    //update votes without refreshing page
    $('.voteForm').on('submit', function(event){

        event.preventDefault();
        
        var $this = $(this);
        var data = $this.serializeArray();
        var goodData = {};
        goodData.postId = data[1].value
        goodData.vote = data[0].value
        //make a post request to /vote, update voting info for this post
        $.post('/vote', goodData, function(response){
            if(response){
                //remove 'hasVoted' class from other voting direction ie up/down
                $this.parent().parent().contents().contents().removeClass('hasVoted');
                //update votescore
                $(`#${Number(response.postId)}`).text(`${response.voteScore}`);
                $('#middleNav').text(`${response.message}`);
                //make up/down button yellow to signify voting with 'hasVoted' class
                $this.addClass('hasVoted')
            }
        })
    })
    
    //activate 'suggest title' button
    $('#createPostForm .input2').on('keyup', function(){
        if ($(this).val().length > 7) {
            //check to see if url is valid
            //ie starts with http:// or https://
            var valid = isValidUrl($(this).val());
            if (valid) {
                $('#suggestTitle').prop('disabled', false);
            } else {
                $('#suggestTitle').prop('disabled', true);
            }
        } else {
            $('#suggestTitle').prop('disabled', true);
        }
    })
    
    //get url value, make a request to /suggestTitle
    $('#suggestTitle').on('click', function(){
        var url = $('.input2').val();
        $.post(`/suggestTitle?url=${url}`, function(title){
            if(title){
                //change value of 'title' textarea to suggested title
                $('.input1').val(title);
            }
        })
        
    })

})

//check if url starts with http://, https://
//if it is not, 'request' will give error
function isValidUrl(url){
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return true;
    } else {
        return false;
    }
}