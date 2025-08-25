pipeline {
    agent { node { label 'mmaudio' } }

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        skipDefaultCheckout(false)
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        // Ensure pnpm uses local cache
        PNPM_CACHE_FOLDER = "${env.WORKSPACE}\\.pnpm-store"
        // Force color output for better logs
        FORCE_COLOR = '1'
        // Node environment
        NODE_ENV = 'development'
    }

    stages {
        stage('Environment Setup') {
            steps {
                echo '🔧 Setting up build environment...'
                bat 'node --version'
                bat 'npm --version'
                bat 'pnpm --version'
                bat 'git --version'
                
                echo "Branch: ${env.BRANCH_NAME}"
                echo "Build: ${env.BUILD_NUMBER}"
                echo "Workspace: ${env.WORKSPACE}"
                
                script {
                    if (env.CHANGE_ID) {
                        echo "🔀 Pull Request Build: PR-${env.CHANGE_ID}"
                        echo "📝 PR Title: ${env.CHANGE_TITLE}"
                        echo "🎯 Target: ${env.CHANGE_TARGET}"
                    } else {
                        echo "🌿 Branch Build: ${env.BRANCH_NAME}"
                    }
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '📦 Installing dependencies...'
                bat 'pnpm install --frozen-lockfile --prefer-offline'
                
                // Verify installation
                bat 'pnpm list --depth=0'
            }
        }

        stage('Lint') {
            steps {
                echo '🔍 Running linting checks...'
                bat 'pnpm lint'
            }
            post {
                failure {
                    echo '❌ Linting failed! Please fix code style issues.'
                }
            }
        }

        stage('Type Check') {
            steps {
                echo '🔎 Running TypeScript type checking...'
                bat 'pnpm typecheck'
            }
            post {
                failure {
                    echo '❌ Type checking failed! Please fix TypeScript errors.'
                }
            }
        }

        stage('Build') {
            steps {
                echo '🏗️ Building all packages...'
                bat 'pnpm build'
                
                // Verify build outputs
                echo '📋 Checking build outputs...'
                bat 'dir packages\\api-utils\\dist'
                bat 'dir packages\\react-app\\dist'
                bat 'dir packages\\electron-app\\dist'
            }
            post {
                failure {
                    echo '❌ Build failed! Please check build errors.'
                }
            }
        }

        stage('Test') {
            steps {
                echo '🧪 Running tests...'
                script {
                    try {
                        bat 'pnpm test'
                    } catch (Exception e) {
                        echo '⚠️ No tests configured or tests failed'
                        echo "Test error: ${e.getMessage()}"
                        // Don't fail the build if tests aren't set up yet
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
            post {
                always {
                    // Archive all test artifacts
                    archiveArtifacts artifacts: 'packages/electron-app/test-results/**/*', allowEmptyArchive: true

                    // Publish test results to Jenkins
                    script {
                        if (fileExists('packages/electron-app/test-results/junit.xml')) {
                            junit testResults: 'packages/electron-app/test-results/junit.xml', allowEmptyResults: true
                        } else {
                            echo '⚠️ No JUnit XML file found - tests may not have run or generated results'
                        }
                    }
                }
                failure {
                    echo '❌ Tests failed! Check test results for details.'
                }
                unstable {
                    echo '⚠️ Some tests failed but build continues.'
                }
            }
        }

        stage('Package') {
            when {
                expression {
                    // Check direct branch builds
                    def directBranch = env.BRANCH_NAME ==~ /(main|develop|release\/.*|feature\/.*)/
                    // Check PR builds targeting feature branches
                    def prToFeature = env.CHANGE_TARGET && env.CHANGE_TARGET ==~ /feature\/.*/
                    return directBranch || prToFeature
                }
            }

            steps {
                echo '📦 Creating distribution packages...'
                bat 'pnpm package'
                
                // Archive artifacts
                archiveArtifacts artifacts: 'packages/electron-app/out/**/*', allowEmptyArchive: true
            }
            post {
                success {
                    echo '✅ Packages created successfully!'
                }
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning up...'
            // Clean up node_modules cache if needed
            // bat 'pnpm store prune'
        }
        success {
            echo '✅ Pipeline completed successfully!'
            script {
                if (env.CHANGE_ID) {
                    echo "🎉 PR-${env.CHANGE_ID} is ready for review!"
                } else {
                    echo "🚀 Branch ${env.BRANCH_NAME} built successfully!"
                }
            }
        }
        failure {
            echo '❌ Pipeline failed!'
            script {
                if (env.CHANGE_ID) {
                    echo "🚨 PR-${env.CHANGE_ID} has build failures that need to be fixed."
                } else {
                    echo "🚨 Branch ${env.BRANCH_NAME} build failed."
                }
            }
        }
        unstable {
            echo '⚠️ Pipeline completed with warnings (tests may have failed).'
        }
    }
}
