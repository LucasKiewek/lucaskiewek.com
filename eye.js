var DrawEye = function(eyecontainer, eyepupil, speed, interval){
  var mouseX = 0, mouseY = 0, xp = 0, yp = 0;
  var limitX = $(eyecontainer).width() - $(eyepupil).width(),
      limitY = $(eyecontainer).height() - $(eyepupil).height(),
      offset = $(eyecontainer).offset();

  var r = $(eyepupil).width()/2;

  $(window).mousemove(function(e){
    mouseX = Math.min(e.pageX - r - offset.left, limitX);
    mouseY = Math.min(e.pageY - r - offset.top, limitY);
    if (mouseX < 0) mouseX = 0;
    if (mouseY < 0) mouseY = 0;
  });


  var follower = $(eyepupil);
  var loop = setInterval(function(){
    xp += (mouseX - xp) / speed;
    yp += (mouseY - yp) / speed;
    follower.css({left:xp, top:yp});
  }, interval);
};

//create eyes
var eye1 = new DrawEye("#eye",  "#pupil", 8, 12);
