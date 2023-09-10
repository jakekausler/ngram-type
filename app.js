var ngramTypeConfig = {
    el: '#app',
    data: function() {

        return {
            // If there are major schema changes, increment this number.
            // and update the `data-reset-modal` message.
            VERSION: 2.104,

            // Data source mappings.
            bigrams: bigrams,
            trigrams: trigrams,
            tetragrams: tetragrams,
            words: words,
            custom_words: null,

            data: {
                source: 'bigrams',
                soundCorrectLetterEnabled: true,
                soundIncorrectLetterEnabled: true,
                soundPassedThresholdEnabled: true,
                soundFailedThresholdEnabled: true,
                bigrams: {
                    scope: 50,
                    combination: 3,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    scores: {},
                    expectedPhrase: '',
                    phrasesCurrentIndex: 0,
                },
                trigrams: {
                    scope: 50,
                    combination: 3,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    scores: {},
                    expectedPhrase: '',
                    phrasesCurrentIndex: 0,
                },
                tetragrams: {
                    scope: 50,
                    combination: 3,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    scores: {},
                    expectedPhrase: '',
                    phrasesCurrentIndex: 0,
                },
                words: {
                    scope: 50,
                    combination: 3,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    scores: {},
                    expectedPhrase: '',
                    phrasesCurrentIndex: 0,
                },
                custom_words: {
                    scope: null,
                    combination: 3,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    scores: {},
                    expectedPhrase: '',
                    phrasesCurrentIndex: 0,
                },
            },

            badGrams: new Set(),
            phrases: [],
            scores: {},
            expectedPhrase: '',
            expectedPhraseParts: [],
            typedPhrase: '',
            startTime: '',
            hitsCorrect: 0,
            hitsWrong: 0,
            isInputCorrect: true,
            rawWPM: 0,
            accuracy: 0,
            progress: 0,
            DEFAULT_REPETITIONS: 3,
            MIN_REPETITIONS: 1,
            DEFAULT_COMBINATIONS: 3,
            MAX_COMBINATIONS: 10,
            GOOD_SCORE: 5,
            MIN_SCORE: -5,
            SCOPE_INCREASE: 50,
            MIN_SCOPE: 50,
            MAX_SCOPE: 200
        }
    },
    computed: {
        dataSource: function() {

            var dataSource = this.data['source'];
            return this.data[dataSource];
        },
        WPMs: function() {

            var dataSource = this.dataSource;
            return dataSource.WPMs;
        },
        averageWPM: function() {

            var dataSource = this.dataSource;
            if ($.isEmptyObject(dataSource.WPMs)) {
                return 0;
            }

            var sum = dataSource.WPMs.reduce(function(a, b) { return (a + b) }, 0);
            var average = sum / dataSource.WPMs.length;
            return Math.round(average);
        },
    },
    mounted: function() {

        // If there's already saved data.
        if (localStorage.ngramTypeAppdata != undefined) {
            var data = this.getSavedData();
            if (
                !data.hasOwnProperty('version')
                || data.version < this.VERSION
            ) {
                // Reset the old/incompatible data.
                this.reset();
                $('#data-reset-modal').modal('toggle');

                this.refreshPhrases();
                this.refreshScores();
                this.updateDataVersion()
            }
            else {
                this.load()
                var dataSource = this.dataSource;
                this.updateShownScores();
                this.expectedPhrase = dataSource.expectedPhrase;
                this.expectedPhraseParts = this.expectedPhrase.split(" ");
                this.updateProgress();
            }
        }

        else {
            this.refreshPhrases();
            this.refreshScores();
            this.updateDataVersion()
        }

        // Use jQuery instead of Vue for intercepting the <Tab>/<Esc> key.
        var that = this;
        $('#input-typing').on('keydown', function(e) {
            var key = e.originalEvent.code;
            if (key == 'Tab' || key == 'Escape') {
                e.preventDefault();
                that.resetCurrentPhraseMetrics();
            }
        });

        this.correctLetterSound = new Audio('./media/sounds/click.mp3');
        this.incorrectLetterSound = new Audio('./media/sounds/clack.mp3');
        this.incorrectPhraseSound = new Audio('./media/sounds/failed.mp3');
        this.correctPhraseSound = new Audio('./media/sounds/ding.wav');
        this.currentPlayingSound = null;
    },
    watch: {
        'data.source': function() {

            var dataSource = this.dataSource;

            // Set or get the last saved lesson.
            if ($.isEmptyObject(dataSource.phrases)) {
                this.refreshPhrases();
            }

            else {
                // this.expectedPhrase = expectedPhrase;
                // Save state in case of page reload.
                this.save();
            }

            this.resetCurrentPhraseMetrics();
        },
        'data.soundCorrectLetterEnabled': function() {

            this.save();
        },
        'data.soundIncorrectLetterEnabled': function() {

            this.save();
        },
        'data.soundPassedThresholdEnabled': function() {

            this.save();
        },
        'data.soundFailedThresholdEnabled': function() {

            this.save();
        },
        custom_words: function() {

            this.refreshPhrasesAndCurrentMetrics();
        },
        typedPhrase: function() {

            // Make sure to reset any error color when moving to next lesson,
            // lesson being reset, all chars being deleted, etc.
            if (!this.typedPhrase.length) {
                this.resetCurrentPhraseMetrics();
            }

            // Remove the spaces at start of the typed phrase
            // since the user might have a typing break
            // but have a habit of typing the spacebar before pausing the session.
            var typedPhrase = this.typedPhrase.trimStart();

            if (typedPhrase.length == 1) {
                this.startTime = new Date().getTime() / 1000;
            }
        },
        WPMs: function() {

            return this.averageWPM;
        },
    },
    methods: {
        save: function() {
            localStorage.ngramTypeAppdata = JSON.stringify(this.data);
        },
        load: function () {
            this.data = JSON.parse(localStorage.ngramTypeAppdata);
        },
        reset: function () {
            localStorage.removeItem('ngramTypeAppdata');
            this.refreshScores();
        },
        getSavedData: function () {

            return JSON.parse(localStorage.ngramTypeAppdata);
        },
        updateDataVersion: function () {

            this.data.version = this.VERSION;
            this.save();
        },
        deepCopy: function(arrayOrObject) {

            var emptyArrayOrObject = $.isArray(arrayOrObject) ? [] : {};
            return $.extend(true, emptyArrayOrObject, arrayOrObject);
        },
        // shuffle: function(array) {
        //
        //     for (var i = array.length - 1; i > 0; i--) {
        //         var j = Math.floor(Math.random() * (i + 1));
        //         [array[i], array[j]] = [array[j], array[i]];
        //     }
        // },
        stopCurrentPlayingSound: function() {

            // Sounds at the end of each phrase/lesson
            // dont need to be played from the beginning.
            if (
                this.currentPlayingSound == this.correctPhraseSound
                || this.currentPlayingSound == this.incorrectPhraseSound
            ) {
                return;
            }

            // Reset any playing sound to handle fast typing,
            // Otherwise, the sound will be intermittent and
            // not in sync with the key presses.
            if (this.currentPlayingSound) {
                this.currentPlayingSound.currentTime = 0;
            }
        },
        refreshScores: function() {

            var dataSource = this.dataSource;
            if (dataSource.combination < this.DEFAULT_COMBINATIONS) {
                dataSource.combination = this.DEFAULT_COMBINATIONS;
            }
            if (dataSource.combination > this.MAX_COMBINATIONS) {
                dataSource.combination = this.MAX_COMBINATIONS;
            }
            if (dataSource.repetition > this.DEFAULT_REPETITIONS) {
                dataSource.repetition = this.DEFAULT_REPETITIONS;
            }
            if (dataSource.repetition < this.MIN_REPETITIONS) {
                dataSource.repetition = this.MIN_REPETITIONS;
            }
            this.generateScores();
            this.progress = 0;
            // this.expectedPhrase = this.generatePhrase(dataSource.combination, dataSource.repetition);
            this.updateShownScores();
            this.nextPhrase();
            this.save();
        },
        updateShownScores: async function() {
            let scores = [];
            for (const ngram in this.dataSource.scores) {
                let color = "";
                // set color to the linear interpolation between red and green based on score
                if (this.dataSource.scores[ngram] <= this.GOOD_SCORE) {
                    color = "rgb(255, " + Math.round(255 * this.dataSource.scores[ngram] / this.GOOD_SCORE) + ", 0)";
                } else {
                    color = "rgb(" + Math.round(255 * (this.GOOD_SCORE - this.dataSource.scores[ngram]) / (this.GOOD_SCORE - this.MIN_SCORE)) + ", 255, 0)";
                }
                scores.push([this.dataSource.scores[ngram], ngram, color]);
            }
            scores.sort(function(a, b) {
                // sort by score, then alphabetically
                if (a[0] == b[0]) {
                    return a[1].localeCompare(b[1]);
                } else {
                    return b[0]-a[0];
                }
            });
            this.scores = scores;
        },
        refreshPhrases: function() {

            var dataSource = this.dataSource;

            if (dataSource.combination < 1) {
                dataSource.combination = 1
            }

            dataSource.phrases = this.generatePhrases(dataSource.combination, dataSource.repetition);
            this.expectedPhrase = dataSource.phrases[0];
            dataSource.phrasesCurrentIndex = 0;
            this.save();
        },
        refreshPhrasesAndCurrentMetrics: function() {

            this.refreshPhrases();
            this.resetCurrentPhraseMetrics();
            this.pauseTimer();
        },
        increaseScores: function(ngrams) {
            let dataSource = this.dataSource;
            ngrams.forEach(ngram => {
                dataSource.scores[ngram] += 1;
                if (dataSource.scores[ngram] > this.GOOD_SCORE) {
                    dataSource.scores[ngram] = this.GOOD_SCORE;
                };
            });
            this.updateShownScores();
        },
        decreaseScores: function(ngrams) {
            let dataSource = this.dataSource;
            ngrams.forEach(ngram => {
                dataSource.scores[ngram] -= 1;
                console.log(dataSource.scores[ngram]);
                if (dataSource.scores[ngram] < this.MIN_SCORE) {
                    dataSource.scores[ngram] = this.MIN_SCORE;
                }
                console.log(dataSource.scores[ngram]);
            });
            this.updateShownScores();
        },
        generatePhrase: function(numberOfItemsToCombine, repetitions) {

            let ngrams = this.worstScoring(numberOfItemsToCombine);
            let subPhrase = ngrams.join(" ");
            let phrase = "";
            for (let i = 0; i < repetitions; i++) {
                phrase += subPhrase + " ";
            }
            return phrase.trim();
        },
        shuffle: function(arr) {

            let currentIndex = arr.length,  randomIndex;

            // While there remain elements to shuffle.
            while (currentIndex > 0) {

                // Pick a remaining element.
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;

                // And swap it with the current element.
                [arr[currentIndex], arr[randomIndex]] = [
                arr[randomIndex], arr[currentIndex]];
            }

            return arr;

        },
        worstScoring: function(n) {

            // let sortableScores = [];
            // let scores = this.dataSource.scores;
            // for (const ngram in scores) {
            //     sortableScores.push([scores[ngram], ngram]);
            // }
            // this.shuffle(sortableScores);
            // sortableScores.sort(function(a, b) {
            //     return a[0]-b[0];
            // });

            // let ret = [];
            // for (let i=0; i<n; i++) {
            //     ret.push(sortableScores[i][1]);
            // }
            // return ret;
            
            // return a weighted random sample of ngrams based on their score
            let scores = this.dataSource.scores;
            let ngrams = [];
            for (const ngram in scores) {
                for (let i=0; i<this.GOOD_SCORE-scores[ngram]; i++) {
                    ngrams.push(ngram);
                }
            }
            let ret = [];
            for (let i=0; i<n; i++) {
                ret.push(ngrams[Math.floor(Math.random() * ngrams.length)]);
            }
            return ret;
        },
        allGoodScores: function() {

            let scores = this.dataSource.scores;
            for (const ngram in scores) {
                if (scores[ngram] < this.GOOD_SCORE) {
                    return false;
                }
            }
            return true;
        },
        generateScores: function() {

            var sourceName = this.data['source'];
            var source = this[sourceName];
            var scope = this.data[sourceName].scope;
            
            // Use indexing to limit scope of Ngrams.
            // Select the Top 50/100/150/200.
            // `Custom` has no scope.
            if (scope) {
                source = source.slice(0, scope)
            }

            var ngrams = this.deepCopy(source);

            var dataSource = this.dataSource;

            dataSource.scores = {};
            ngrams.forEach(element => {
                dataSource.scores[element] = 0;
            });
        },
        generatePhrases: function(numberOfItemsToCombine, repetitions) {

            var dataSource = this.data['source'];
            var source = this[dataSource];
            var scope = this.data[dataSource].scope

            // Use indexing to limit scope of Ngrams.
            // Select the Top 50/100/150/200.
            // `Custom` has no scope.
            if (scope) {
                source = source.slice(0, scope)
            }

            var ngrams = this.deepCopy(source);

            this.shuffle(ngrams);
            var ngramsProcessed = 0;
            var phrases = [];

            while (ngrams.length) {
                var ngramsSublist = ngrams.slice(0, numberOfItemsToCombine);
                var subPhrase = ngramsSublist.join(' ');
                var _phrase = [];
                for (var i = 0; i < repetitions; i++) {
                    _phrase.push(subPhrase);
                }
                phrases.push(_phrase.join(' '));
                // Remove the processed ngrams.
                ngrams.splice(0, numberOfItemsToCombine);
            }

            return phrases
        },
        pauseTimer: function(e) {

            var isStopped = $('.timer').countimer('stopped');
            if (!isStopped) {
                $('.timer').countimer('stop');
            }
        },
        resumeTimer: function(e) {

            var isStopped = $('.timer').countimer('stopped');
            if (isStopped) {
                $('.timer').countimer('resume');
            }
        },
        keyHandler: function(e) {

            var key = e.key;

            // For other miscellaneous keys.
            if (key.length > 1) {
                return;
            }

            // Remove spaces at starting of the phrase
            var typedPhrase = this.typedPhrase.trimStart();
            if (!typedPhrase.length) {
                return;
            }

            this.resumeTimer();

            if (this.expectedPhrase.startsWith(typedPhrase)) {
                if (this.data.soundCorrectLetterEnabled) {
                    this.stopCurrentPlayingSound();
                    this.correctLetterSound.play();
                    this.currentPlayingSound = this.correctLetterSound;
                }
                this.isInputCorrect = true;
                this.hitsCorrect += 1;
            }
            else if (this.expectedPhrase !== typedPhrase.trimEnd()) {
                if (this.data.soundIncorrectLetterEnabled) {
                    this.stopCurrentPlayingSound();
                    this.incorrectLetterSound.play();
                    this.currentPlayingSound = this.incorrectLetterSound;
                }
                this.isInputCorrect = false;
                let typedPhraseParts = typedPhrase.split(" ");
                let expectedPhraseParts = this.expectedPhraseParts;
                for (let i = 0; i < typedPhraseParts.length; i++) {
                    if (typedPhraseParts[i] != expectedPhraseParts[i] && typedPhraseParts[i]) {
                        this.badGrams.add(expectedPhraseParts[i]);
                        break;
                    }
                }
                this.hitsWrong += 1;
            }

            if (typedPhrase.trimEnd() === this.expectedPhrase) {
                var currentTime = new Date().getTime() / 1000;
                this.rawWPM = Math.round(
                    // 5 chars equals 1 word.
                    ((this.hitsCorrect + this.hitsWrong) / 5) / (currentTime - this.startTime) * 60
                );

                this.accuracy = Math.round(
                    this.hitsCorrect / (this.hitsCorrect + this.hitsWrong) * 100
                );

                var dataSource = this.dataSource;
                if (
                    this.rawWPM < dataSource.minimumWPM
                    || this.accuracy < dataSource.minimumAccuracy
                ) {
                    if (this.data.soundFailedThresholdEnabled) {
                        this.stopCurrentPlayingSound();
                        this.incorrectPhraseSound.play();
                        this.currentPlayingSound = this.incorrectPhraseSound;
                    }
                    this.resetCurrentPhraseMetrics();
                    this.reduceTraining();
                    this.pauseTimer();
                    return;
                }

                // Reset WPMs when starting a new round in the same lesson.
                var newRoundStarted = (dataSource.phrasesCurrentIndex == 0);
                if (newRoundStarted) {
                    dataSource.WPMs = [];
                }
                dataSource.WPMs.push(this.rawWPM);

                if (this.data.soundPassedThresholdEnabled) {
                    this.stopCurrentPlayingSound();
                    this.correctPhraseSound.play();
                    this.currentPlayingSound = this.correctPhraseSound;
                }
                this.pauseTimer();
                this.advanceTraining();
                // this.nextPhrase();
            }
        },
        resetCurrentPhraseMetrics: function() {

            this.hitsCorrect = 0;
            this.hitsWrong = 0;
            this.typedPhrase = '';
            this.isInputCorrect = true;
        },
        nextPhrase: function() {

            this.resetCurrentPhraseMetrics();
            var dataSource = this.dataSource;
            // var nextPhraseExists = (dataSource.phrases.length > dataSource.phrasesCurrentIndex + 1);
            // if (nextPhraseExists) {
            //     dataSource.phrasesCurrentIndex += 1;
            //     this.expectedPhrase = dataSource.phrases[dataSource.phrasesCurrentIndex];
            //     this.save();
            // }
            // // Start again from beginning, but generate new data.
            // else {
            //     this.refreshPhrases();
            // }
            this.expectedPhrase = this.generatePhrase(dataSource.combination, dataSource.repetition);
            this.expectedPhraseParts = this.expectedPhrase.split(" ");
            dataSource.expectedPhrase = this.expectedPhrase;
            this.save();
        },
        customWordsModalShow: function() {

            var $customWordsModal = $('#custom-words-modal');
            var customWords = this.custom_words.join('\n')
            $customWordsModal.find('textarea').val(customWords);
        },
        customWordsModalSubmit: function() {

            var $customWordsModal = $('#custom-words-modal');
            var customWordsSubmitted = $customWordsModal.find('textarea').val();

            // Convert to array, remove the empty string.
            var customWordsProccessed = customWordsSubmitted.split(/\s+/).filter(function(element) {return element});

            $customWordsModal.modal("hide");
            this.custom_words = customWordsProccessed;
        },
        getProgress: function() {
            let dataSource = this.dataSource;
            let sum = 0;
            for (const gram in dataSource.scores) {
                sum += Math.min(dataSource.scores[gram], this.GOOD_SCORE);
            };
            console.log(sum, dataSource.combination, sum / (this.GOOD_SCORE * dataSource.combination));
            var progress = sum / (this.GOOD_SCORE * dataSource.combination);
            return Math.round(progress * 100)/100;
        },
        updateProgress: async function() {
            this.progress = this.getProgress();
        },
        getNextSource: function() {
            switch (this.data.source) {
                case 'bigrams':
                    return 'trigrams';
                case 'trigrams':
                    return 'tetragrams';
                case 'tetragrams':
                    return 'words';
                default:
                    return 'words';
            }
        },
        getNextScope: function() {
            return this.dataSource.scope + this.SCOPE_INCREASE
        },
        advanceTraining: function() {
            this.increaseScores(this.expectedPhrase.split(" ").splice(0, this.dataSource.combination));
            if (this.allGoodScores()) {
                // console.log("All Good Scores");
                if (this.data.source != 'words' || this.dataSource < 200) {
                    // console.log("Not on final tier");
                    var newScope = this.getNextScope();
                    let dataSource = this.dataSource;
                    if (dataSource.combination < this.MAX_COMBINATIONS) {
                        // console.log("Not at max combinations, going up");
                        dataSource.combination += 1;
                        // console.log("New Combinations: " + dataSource.combination);
                    } else {
                        // console.log("At max combinations, resetting");
                        dataSource.combination = this.DEFAULT_COMBINATIONS;
                        if (dataSource.repetition > this.MIN_REPETITIONS) {
                            // console.log("Not at max repetitions")
                            dataSource.repetition -= 1;
                            // console.log("New repetitions: ", dataSource.repetition);
                        } else {
                            // console.log("At min repetitions, resetting");
                            dataSource.repetitions = this.DEFAULT_REPETITIONS;
                            if (newScope > this.MAX_SCOPE) {
                                // console.log("At max scope, moving on");
                                this.data.source = this.getNextSource();
                                this.dataSource.scope = this.MIN_SCOPE;
                                // console.log("New Source: ", this.data.source);
                                // console.log("New Scope: ", dataSource.scope);
                            } else {
                                // console.log("New scope: " + newScope);
                                this.dataSource.scope = newScope;
                            }
                        }
                    }
                } else {
                    // console.log("On final tier");
                    let dataSource = this.dataSource;
                    if (dataSource.combination < this.MAX_COMBINATIONS) {
                        // console.log("Not at max combinations, going up");
                        dataSource.combination += 1;
                        // console.log("New Combinations: " + dataSource.combination);
                    } else if (dataSource.repetition > this.MIN_REPETITIONS) {
                        // console.log("Not at max repetitions, going up");
                        dataSource.combination = this.DEFAULT_COMBINATIONS;
                        dataSource.repetition -= 1;
                        // console.log("New Repetitions: " + dataSource.repetition);
                    } else {
                        // console.log("At max combinations and repetitions");
                    }
                }
                this.refreshScores();
            } else {
                // console.log("Still working");
                // console.log("Current Combinations: " + this.currentCombinations);
                // console.log("Current Scope: " + this.dataSource.scope)
                this.updateProgress();
                this.nextPhrase();
            }
        },
        reduceTraining: function() {
            this.decreaseScores(this.badGrams);
            this.updateProgress();
            this.badGrams.clear();
        }
    },
};

var ngramTypeApp = new Vue(ngramTypeConfig);
