
(function () {

  var github = new Github({
    // username: "YOU_USER",
    // password: "YOUR_PASSWORD",
    // auth: "basic"
  });


  var showIssues = function (repo) {
    var issues = github.getIssues(repo.owner.login, repo.name);
    var opts = {};
    issues.list(opts, function(err, issues) {
      console.log(err, issues);
    });
  };


  var done = function (repos) {

    repos = _.sortBy(repos, function (i) {
      return i.name.toLowerCase();
    });

    console.log(repos);

    var Repo = React.createClass({
      showIssues: function () {
        showIssues(this.props.repo);
      },
      render: function () {
        var repo = this.props.repo;
        return (
          <div>
            <a href={repo.html_url}>{repo.name}</a>
            &nbsp;
            (<a href="#" onClick={this.showIssues}>issues</a>)
          </div>
        );
      }
    });

    var reposCmp = [];

    if (repos) {
      repos.forEach(function (repo) {
        reposCmp.push(
          <Repo repo={repo} />
        );
      })
    }

    React.render(
      <div>{reposCmp}</div>
      ,
      document.getElementById('wrap')
    );

  };


  var repos = localStorage.getItem('repos');

  if (repos) {
    repos = JSON.parse(repos);
    done(repos);
  }
  else {

    var user = github.getUser();

    user.userRepos('AndersDJohnson', function(err, repos) {
      if (err) throw err;
      localStorage.setItem('repos', JSON.stringify(repos));
      done(repos);
    });

  }

});
