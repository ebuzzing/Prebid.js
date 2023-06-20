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

    gulp build --modules=userId,consentManagement,teadsIdSystem,teadsBidAdapter

You can add any other modules at the end of the list

In order to change the Prebid.js instance name, which is by default `pbjs`, you have to modify the variable `globalVarName` inside the file `package.json` to your own custom instance name. \
Don't forget to build again to apply this change.

## Testing

Example :

    gulp test --nofixlint --file "test/spec/modules/teadsIdSystem_spec.js"

To functionnal test new dev on teadsIdSystem or teadsBidAdapter, please follow this page [How to debug with Charles Proxy](https://teads.atlassian.net/wiki/spaces/SSP/pages/4413590206/Debug+with+Charles)

