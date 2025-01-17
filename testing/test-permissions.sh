#! /bin/bash
BASE_URL=$1
set -e -E -o pipefail
source `dirname $0`/common.sh
cat >anonymous.index.tmp <<EOF
        <a class="button_link during_button" href="slideshow.php">Slideshow</a>
        <a class="button_link during_button" href="ondeck.php">Racers On Deck</a>
        <a class="button_link during_button" href="racer-results.php">Results By Racer</a>
        <a class="button_link after_button" href="export.php">Export Results</a>
        <a class="button_link other_button" href="about.php">About</a>
        <a class="button_link other_button" href="login.php">Log in</a>
EOF

## Every page, and every action

user_logout

OK=1
( curl_get index.php | grep '<a' | grep button_link | diff -b - anonymous.index.tmp ) || OK=0
if [ $OK -eq 0 ]; then
    curl_get index.php | grep '<a' | grep button_link
    test_fails Anonymous index page
fi

curl_post action.php "action=kiosk.assign" | check_failure

curl_post action.php "action=result.delete" | check_failure
curl_post action.php "action=racer.edit" | check_failure
curl_post action.php "action=result.write" | check_failure
curl_post action.php "action=racer.import" | check_failure

# curl_post action.php "action=login" | check_failure
curl_post action.php "action=racer.new" | check_failure
curl_post action.php "action=racer.pass" | check_failure
curl_post action.php "action=photo" | check_failure
# TODO Replay application registers itself without credentials, a security weakness.
# curl_post action.php "action=register-replay" | check_failure
curl_post action.php "action=replay-test" | check_failure
curl_post action.php "action=schedule.reschedule" | check_failure
curl_post action.php "action=schedule.generate" | check_failure
curl_post action.php "action=heat.select" | check_failure
curl_post action.php "action=timer-message" | check_failure
curl_post action.php "action=award.xbs" | check_failure

# Queries don't answer "<success/>" or "<failure/>", so there's really
# nothing to check other than that they parse as XML.
curl_get "action.php?query=class.list" > /dev/null
curl_get "action.php?query=poll.coordinator" > /dev/null
curl_get "action.php?query=kiosk.poll" > /dev/null
curl_get "action.php?query=poll.kiosk.all" > /dev/null
curl_get "action.php?query=roles"  > /dev/null
curl_get "action.php?query=poll.ondeck" > /dev/null
curl_get "action.php?query=poll.now-racing" > /dev/null

cat >coordinator.index.tmp <<EOF
          <a class="button_link before_button" href="setup.php">Set-Up</a>
          <a class="button_link before_button" href="checkin.php">Race Check-In</a>
          <a class="button_link left before_button" href="photo-thumbs.php?repo=head"><b>Racer</b><br/>Photos</a>
          <a class="button_link right before_button" href="photo-thumbs.php?repo=car"><b>Car</b><br/>Photos</a>
          <a class="button_link during_button" href="coordinator.php">Race Dashboard</a>
          <a class="button_link during_button" href="kiosk-dashboard.php">Kiosk Dashboard</a>
          <a class="button_link during_button" href="judging.php">Judging</a>
          <a class="button_link during_button" href="ondeck.php">Racers On Deck</a>
          <a class="button_link during_button" href="racer-results.php">Results By Racer</a>
          <a class="button_link after_button" href="awards-presentation.php">Present Awards</a>
          <a class="button_link after_button" href="standings.php">Standings</a>
          <a class="button_link after_button" href="export.php">Export Results</a>
          <a class="button_link after_button" href="history.php">Retrospective</a>
          <a class="button_link other_button" href="print.php">Printables</a>
          <a class="button_link other_button" href="about.php">About</a>
          <a class="button_link other_button" href="login.php?logout">Log out</a>
EOF

user_login_coordinator
( curl_get index.php | grep '<a' | grep button_link | diff -b - coordinator.index.tmp ) || OK=0
if [ $OK -eq 0 ]; then
    curl_get index.php | grep '<a' | grep button_link
    test_fails Coordinator index page
fi
user_logout

( curl_get index.php | grep '<a' | grep button_link | diff -b - anonymous.index.tmp ) || OK=0
if [ $OK -eq 0 ]; then
    test_fails Anonymous index page again
fi

cat >racecrew.index.tmp <<EOF
        <a class="button_link before_button" href="checkin.php">Race Check-In</a>
          <a class="button_link left before_button" href="photo-thumbs.php?repo=head"><b>Racer</b><br/>Photos</a>
          <a class="button_link right before_button" href="photo-thumbs.php?repo=car"><b>Car</b><br/>Photos</a>
        <a class="button_link during_button" href="judging.php">Judging</a>
        <a class="button_link during_button" href="slideshow.php">Slideshow</a>
        <a class="button_link during_button" href="ondeck.php">Racers On Deck</a>
        <a class="button_link during_button" href="racer-results.php">Results By Racer</a>
        <a class="button_link after_button" href="standings.php">Standings</a>
        <a class="button_link after_button" href="export.php">Export Results</a>
        <a class="button_link other_button" href="print.php">Printables</a>
        <a class="button_link other_button" href="about.php">About</a>
        <a class="button_link other_button" href="login.php?logout">Log out</a>
EOF

user_login_crew
( curl_get index.php | grep '<a' | grep button_link | diff -b - racecrew.index.tmp ) || OK=0
if [ $OK -eq 0 ]; then
    curl_get index.php | grep '<a' | grep button_link
    test_fails Race crew index page
fi
user_logout

( curl_get index.php | grep '<a' | grep button_link | diff -b - anonymous.index.tmp ) || OK=0
if [ $OK -eq 0 ]; then
    curl_get index.php | grep '<a' | grep button_link
    test_fails Anonymous third time
fi

rm *.index.tmp

