# service-prebid

This repository is a copy of [ebuzzing/Prebid.js](https://github.com/ebuzzing/Prebid.js) which is a fork of [prebid/Prebid.js](https://github.com/prebid/Prebid.js)

Here are the main branches :

- **master** --> synchronized with prebid/Prebid.js
- **master-teads** --> based on master with Teads CI commits

## Contributing

Before contributing, be sure to have the main branches up to date.  
If it's not the case, ask to ***#ssp-omnichannel-supply-lane*** to update them (only this team have the right to do it)

To update branches :

1. Go to [ebuzzing/Prebid.js](https://github.com/ebuzzing/Prebid.js) and click on `Sync fork` --> This will update the master branch of [ebuzzing/Prebid.js](https://github.com/ebuzzing/Prebid.js)

2. Come back to `service-prebid` and execute these commands on `master` branch

```
    git remote add upstream https://github.com/ebuzzing/Prebid.js.git # only if you don't have this remote endpoint yet   
    git fetch upstream  
    git rebase upstream/master
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
    
## Build

To build only prebid.js file with Teads modules :

    gulp build --modules=userId,consentManagement,teadsIdSystem,teadsBidAdapter

You can add any other modules at the end of the list

## Testing

Example :

    gulp test --nofixlint --file "test/spec/modules/teadsIdSystem_spec.js"

To functionnal test new dev on teadsIdSystem or teadsBidAdapter, please follow this page [How to debug with Charles Proxy](https://teads.atlassian.net/wiki/spaces/SSP/pages/4413590206/Debug+with+Charles)

