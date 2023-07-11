# service-prebid

This repository is a copy of [ebuzzing/Prebid.js](https://github.com/ebuzzing/Prebid.js) which is a fork of [prebid/Prebid.js](https://github.com/prebid/Prebid.js)

Here are the main branches :

- **master** --> synchronized with prebid/Prebid.js
- **master-teads** --> based on master with Teads CI commits

## Contributing

Before contributing, be sure to have the main branches up to date.  
If it's not the case, ask to ***#ssp-omnichannel-supply-lane*** to update them (only this team have the right to do it)

### To update branches :

1. Go to [ebuzzing/Prebid.js](https://github.com/ebuzzing/Prebid.js) and click on `Sync fork` --> This will update the master branch of [ebuzzing/Prebid.js](https://github.com/ebuzzing/Prebid.js)

2. Come back to `service-prebid` and execute these commands on `master` branch

```
    git remote add Prebid.js https://github.com/ebuzzing/Prebid.js.git # only if you don't have this remote endpoint yet   
    git fetch Prebid.js  
    git rebase Prebid.js/master
    git push origin master --force 
```

3. Checkout on `master-teads` branch and rebase on `master` then push -force

```
    git checkout master-teads
    git rebase master 
    git push origin master-teads --force
```

4. Before commit, think to run test and format your code or CI will fail 

```
    gulp test --fix
```

### To develop :
1. On `service-prebid` create a new branch `your_branch_name` based on `master-teads`.
2. Push your branch and open a PR on `service-prebid`
3. When it's approved on Teads side, You can now open a PR on the official repository 

### To create a PR on prebid/Prebid.js official repository :

The goal is to push a branch in the forked repository `ebuzzing/Prebid.js`. \
To do that, you have to choose between 2 methods depending on the volume of changes and your technical skills with git :

First we are going to open a branch with branch `your_branch_name` changes on `ebuzzing/Prebid.js` :
- 1st method - New branch
    - Preferred when the **changes are simple**
- 2nd method - Rebase branch
    - Preferred when there are a **lot of changes**
    - Better to use a Git client like IntelliJ or Fork (recommended option)
    - Or you can manage this in CLI if you masterize the interactive rebase

#### 1st method - New branch

1. Go into repository `ebuzzing/Prebid.js`, checkout to branch `master`
2. Create a new branch based on master
3. Commit your changes done previously on `service-prebid` branch `your_branch_name`
4. Push your branch on `ebuzzing/Prebid.js`

#### 2nd method - Rebase branch

Please choose either Git Client option or CLI option.

#### 2nd method - Rebase branch - Git Client option

1. Go in repository `ebuzzing/service-prebid` on master
2. Rebase interactive your branch on `master` (previously based on `master-teads`)
3. Drop commits from `master-teads` related to CI/Teads-only. Keep only your changes commits.
4. Push this branch on remote `ebuzzing/Prebid.js`

#### 2nd method - Rebase branch - CLI option
```
1. cd service-prebid
2. checkout your_branch_name 
3. git remote add Prebid.js git@github.com:ebuzzing/Prebid.js.git
4. git rebase -i Prebid.js/master // Here drop commits from `master-teads` related to CI/Teads-only. Keep only your changes commits.
5. git push Prebid.js your_branch_name
```
#### Open the PR on the official Prebid.js repository

Once your branch is remotely on `ebuzzing/Prebid.js` you can open the PR directly on this repository

1. Go on either https://github.com/ebuzzing/Prebid.js or https://github.com/prebid/Prebid.js
2. Create a new PR with your branch `your_branch_name`
3. Make sure that the new PR is `from ebuzzing/Prebid.js:your_branch_name` and goes `into prebid/Prebid.js:master`
4. When the PR is opened on the official repository, you can close the original `service-prebid` PR as in the future `master-teads` branch of `service-prebid` repository will be sync with your released dev.

## Build

To build only prebid.js file with Teads modules :

    gulp build --modules=userId,consentManagement,consentManagementGpp,teadsIdSystem,teadsBidAdapter

You can add any other modules at the end of the list

In order to change the Prebid.js instance name, which is by default `pbjs`, you have to modify the variable `globalVarName` inside the file `package.json` to your own custom instance name. \
Don't forget to build again to apply this change.

## Testing

Example :

    gulp test --nofixlint --file "test/spec/modules/teadsIdSystem_spec.js"

To functionally test new dev on teadsIdSystem or teadsBidAdapter, please follow this page [How to debug with Charles Proxy](https://teads.atlassian.net/wiki/spaces/SSP/pages/4413590206/Debug+with+Charles)

## Testing Locally on Test Page

### Mock responses

To try the teadsBidAdapter with local changes on a test page you can use a custom local page with the commands :

```
gulp serve-teads --modules=userId,consentManagement,consentManagementGpp,teadsIdSystem,teadsBidAdapter
```

This will automatically build your prebid.js and start a local server on http://localhost:9999. \
Then go to http://localhost:9999/test/pages/bannerTeads.html to see a page integrated with teadsBidAdapter. \
On the page, open the console and go to the Network tab you should see the teads bid-request being requested. Refresh the page if you can't see the bid-request. \
The request is an HTTP GET request on the endpoint `localhost:8080/hb/bid-request/hb/bid-request` which is a local url not used for Teads production. So it will return a bid-response only if an SSP is run locally. \
More information how to run locally the SSP : service-rtb documentation


In the command we explicitly specify to only have Teads modules in the prebid.js script, if you want all modules (other bid adapter, consent modules etc ...) feel free to remove the `--modules` option.

### Mock responses

If you want to mock the bid request and the bid response, you can use the fakeserver : [fake-server readme](test/fake-server/README.md) \
You can use the following commands : 

```
serve-teads-with-fakeserver --modules=userId,consentManagement,consentManagementGpp,teadsIdSystem,teadsBidAdapter
```

This will both start local server and fakeserver.
