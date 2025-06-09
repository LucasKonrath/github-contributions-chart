import { TbBrandTwitter, TbShare, TbDownload, TbCopy } from "react-icons/tb";
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  download,
  fetchData,
  downloadJSON,
  cleanUsername,
  share,
  copyToClipboard
} from "../utils/export";
import ThemeSelector from "../components/themes";

const USERNAMES = [
  'marcelobck',
  'xmacedo',
  'andeerlb',
  'karane',
  'Lee22br', // fixed casing
  'vfurinii',
  'joaoguilhermedesa',
  'icarocaetano'
];

const App = () => {
  const canvasRef = useRef();
  const contentRef = useRef();
  // Use a map of refs for each username
  const canvasRefs = useRef({});

  // Create a stable ref callback for each username
  const getCanvasRef = useCallback((username) => (el) => {
    if (el) canvasRefs.current[username] = el;
  }, []);

  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("standard");
  const [userData, setUserData] = useState([]);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/v1/[username]')
      .then((res) => res.json())
      .then((results) => {
        setUserData(results);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to fetch user data');
        setLoading(false);
      });
  }, []);

  // Draw charts after data is loaded
  useEffect(() => {
    if (!userData.length) return;
    (async () => {
      const { drawContributions } = await import('github-contributions-canvas');
      userData.forEach(({ username, data }) => {
        const canvas = canvasRefs.current[username];
        if (canvas && data) {
          drawContributions(canvas, {
            data,
            username,
            themeName: theme,
            footerText: 'Made by @sallar & friends - github-contributions.vercel.app'
          });
        }
      });
    })();
  }, [userData, theme]);

  const onDownload = (e) => {
    e.preventDefault();
    download(canvasRef.current);
  };

  const onCopy = (e) => {
    e.preventDefault();
    copyToClipboard(canvasRef.current);
  };

  const onDownloadJson = (e) => {
    e.preventDefault();
    if (userData != null) {
      downloadJSON(userData);
    }
  };

  const onShare = (e) => {
    e.preventDefault();
    share(canvasRef.current);
  };

  // Download all PNGs for all users with a delay between each
  const onDownloadAll = async (e) => {
    e.preventDefault();
    for (const { username } of userData) {
      const canvas = canvasRefs.current[username];
      if (canvas) {
        try {
          const dataUrl = canvas.toDataURL();
          const a = document.createElement('a');
          document.body.appendChild(a);
          a.download = `${username}-contributions.png`;
          a.href = dataUrl;
          a.click();
          document.body.removeChild(a);
        } catch (err) {
          console.error(err);
        }
        // Wait 400ms before next download to allow browser to process
        await new Promise(res => setTimeout(res, 400));
      }
    }
  };

  const _renderGithubButton = () => {
    return (
      <div className="App-github-button">
        <a
          className="github-button"
          href="https://github.com/sallar/github-contributions-chart"
          data-size="large"
          data-show-count="true"
          aria-label="Star sallar/github-contribution-chart on GitHub"
        >
          Star
        </a>
      </div>
    );
  };

  const _renderLoading = () => {
    return (
      <div className="App-centered">
        <div className="App-loading">
          <img src={"/loading.gif"} alt="Loading..." width={202} height={125} />
          <p>Please wait, I’m visiting your profile...</p>
        </div>
      </div>
    );
  };

  const _renderGraphs = () => {
    if (loading) return _renderLoading();
    if (error) return _renderError();
    return (
      <div className="App-result">
        <p>Charts for 8 GitHub users:</p>
        <button className="App-download-button" onClick={onDownloadAll} type="button" style={{marginBottom: 16}}>
          <TbDownload size={18} /> Download All PNGs
        </button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
          {userData.map(({ username, data }) => (
            <div key={username} style={{ flex: '1 1 300px', minWidth: 320 }}>
              <h3>{username}</h3>
              <canvas
                ref={getCanvasRef(username)}
                width={720}
                height={180}
                style={{ border: '1px solid #eee', background: '#fff' }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const _renderError = () => {
    return (
      <div className="App-error App-centered">
        <p>{error}</p>
      </div>
    );
  };

  const _renderDownloadAsJSON = () => {
    if (userData === null) return;
    return (
      <a href="#" onClick={onDownloadJson}>
        <span role="img" aria-label="Bar Chart">
          📊
        </span>{" "}
        Download data as JSON for your own visualizations
      </a>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="App-logo">
          <img src="/topguntocat.png" width={224} height={111} alt="Topguntocat" />
          <h1>GitHub Contributions Chart Generator</h1>
          <h4>All your contributions in one image!</h4>
        </div>
        <ThemeSelector
          currentTheme={theme}
          onChangeTheme={(themeName) => setTheme(themeName)}
        />
        {_renderGithubButton()}
        <footer>
          <p>
            Not affiliated with GitHub Inc. Octocat illustration from{" "}
            <a href="https://octodex.github.com/topguntocat/" target="_blank">
              GitHub Octodex
            </a>
            .
          </p>
          <div className="App-powered">
            <a
              href="https://vercel.com/?utm_source=github-contributions-chart&utm_campaign=oss"
              target="_blank"
            >
              <img src="/powered-by-vercel.svg" alt="Powered by Vercel" />
            </a>
          </div>
        </footer>
      </header>
      <section className="App-content" ref={contentRef}>
        {mounted ? _renderGraphs() : null}
      </section>
    </div>
  );
};

export default App;
