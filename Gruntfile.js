// Generated on 2014-12-01 using generator-angular 0.10.0
'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Configurable paths for the application
  var appConfig = {
    app: 'app',
    dist: 'dist',
    inst: 'instrumented',
    site: grunt.option('site') || 'default'
  };

  // Define the configuration for all the tasks
  grunt.initConfig({

    // Project settings
    sdmapp: appConfig,

    clean: {
      test: ['<%= sdmapp.inst %>', 'coverage'],
      build: ['<%= sdmapp.dist %>'],
      nodeModules: ['node_modules']
    },

    // Watches files for changes and runs tasks based on the changed files
    watch: {
      js: {
        files: ['<%= sdmapp.app %>/components/{,**/}*.js'],
        //tasks: ['newer:jshint:all'],
        options: {
          livereload: '<%= connect.options.livereload %>'
        }
      },
      jsTest: {
        files: ['test/unit/spec/{,*/}*.js'],
        tasks: ['newer:jshint:test', 'karma']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      },
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>'
        },
        files: [
          '<%= sdmapp.app %>/{,*/}*.html',
          '.tmp/styles/{,*/}*.css',
          '<%= sdmapp.app %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      }
    },


    // The actual grunt server settings
    connect: {
      options: {
        port: 8443,
        protocol: 'https',
        // Change this to '0.0.0.0' to access the server from outside.
        hostname: 'localhost',
        livereload: 35729
      },
      livereload: {
        options: {
          open: true,
          middleware: function (connect) {
            return [
              connect.static(appConfig.app)
            ];
          }
        }
      },
      test: {
        options: {
          port: 9001,
          middleware: function (connect) {
            return [
              connect.static('test/unit'),
              connect.static(appConfig.app)
            ];
          }
        }
      },
      coverage: {
        options: {
          protocol: 'http',
          open: true,
          port: 8000,
          middleware: function(connect) {
            return [
              connect.static('coverage/phantomjs')
            ];
          }
        }
      },
      dist: {
        options: {
          open: true,
          base: '<%= sdmapp.dist %>'
        }
      },
      e2e: {
        options: {
            port: 9000,
            base: '<%= sdmapp.inst %>/app'
        },
        runtime: {
            options: {
                middleware: function (connect) {
                    return [
                        lrSnippet,
                        mountFolder(connect, '<%= sdmapp.inst %>'),
                        mountFolder(connect, '.......')
                    ];
                }
            }
        }
      },
      integration: {
        options: {
            port: 9000,
            base: '<%= sdmapp.inst %>/app'
        },
        runtime: {
            options: {
                middleware: function (connect) {
                    return [
                        lrSnippet,
                        mountFolder(connect, '<%= sdmapp.inst %>'),
                        mountFolder(connect, '.......')
                    ];
                }
            }
        }
      }
    },

    // Make sure code styles are up to par and there are no obvious mistakes
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= sdmapp.app %>/components/{,**/}*.js',
          '<%= sdmapp.app %>/config/*.js'
        ]
      },
      test: {
        options: {
          jshintrc: 'test/unit/.jshintrc'
        },
        src: ['test/unit/spec/{,*/}*.js']
      }
    },

    // Copies remaining files to places other tasks can use
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= sdmapp.app %>',
          dest: '<%= sdmapp.dist %>',
          src: [
             '*.{js,html,less}',
             'components/**/*.{js,html,less}',
             'config/**/*',
             'bootstrap/**/*'
          ]
        }]
      },
      coverageE2E: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= sdmapp.app %>',
          dest: '<%= sdmapp.inst %>/app',
          src: [
            '*.{html,less}',
            'components/**/*.html',
            'components/**/*.less',
            'config/**/*',
            'bootstrap/**/*',
            '!config/**/*.js'
          ]
        }]
      }
    },

    symlink: {
      options: {
        overwrite: true
      },
      inst: {
        src:  '<%= sdmapp.inst %>/<%= sdmapp.app %>/config/<%= sdmapp.site%>',
        dest: '<%= sdmapp.inst %>/<%= sdmapp.app %>/active_config'
      },
      dist: {
        src: '<%= sdmapp.dist %>/config/<%= sdmapp.site%>',
        dest: '<%= sdmapp.dist %>/active_config'
      }
    },

    // Test settings
    karma: {
      unit: {
        configFile: 'test/unit/karma.conf.js',
        singleRun: true
      }
    },

    protractor_coverage: {
        options: {
            keepAlive: true,
            noColor: false,
            coverageDir: 'coverage/e2e',
            args: {
                baseUrl: 'https://localhost:9000'
            }
        },
        local: {
            options: {
              //baseUrl: 'https://localhost:9000',
              configFile: 'test/e2e/protractor-conf.js'
            }
        },
        integration: {
            options: {
              //baseUrl: 'https://localhost:9000',
              coverageDir: 'coverage/integration',
              configFile: 'test/integration/protractor-conf.js'
            }
        }
    },

    instrument: {
        files: ['app/**/*.js'],
        options: {
          lazy: true,
          basePath: '<%= sdmapp.inst %>/'
        }
    },

    makeReport: {
      src: 'coverage/**/*.json',
      options: {
        type: 'lcov',
        dir: 'coverage/e2e',
        print: 'detail'
      }
    }
  });


  grunt.registerTask('serve', 'Compile then start a connect web server', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'connect:dist:keepalive']);
    }
    if (target === 'coverage') {
      return grunt.task.run(['connect:coverage:keepalive']);
    }
    if (target === 'e2e') {
      grunt.task.run([
        'copy:coverageE2E',
        'symlink:inst',
        'instrument',
        'connect:e2e:keepalive'
        ]);
    }

    grunt.task.run([
      'connect:livereload',
      'watch'
    ]);
  });

  grunt.registerTask('server', 'DEPRECATED TASK. Use the "serve" task instead', function (target) {
    grunt.log.warn('The `server` task has been deprecated. Use `grunt serve` to start a server.');
    grunt.task.run(['serve:' + target]);
  });

  grunt.registerTask('lint', ['newer:jshint:all']);

  grunt.registerTask('test', [
    'connect:test',
    'karma'
  ]);

  grunt.registerTask('test', [
    'connect:test',
    'karma'
  ]);

  grunt.registerTask('travis', [
    'connect:test',
    'karma'
  ]);

  grunt.registerTask('coverage', [
    'clean:test',
    'connect:test',
    'karma',
    'connect:coverage:keepalive'
  ]);

  grunt.registerTask('e2e', [
    'copy:coverageE2E',
    'symlink:inst',
    'instrument',
    'connect:e2e',
    'protractor_coverage:local',
    'makeReport'
    ]
  );

  grunt.registerTask('integ', [
    'copy:coverageE2E',
    'symlink:inst',
    'instrument',
    'connect:integration',
    'protractor_coverage:integration',
    'makeReport'
    ]
  );

  grunt.registerTask('build', [
    'clean:build',
    'copy:dist',
    'symlink:dist'
  ]);

  grunt.registerTask('default', [
    'newer:jshint',
    'test',
    'build'
  ]);
};
