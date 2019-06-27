<script>
  import { H1, H2 } from "./typo";
  let value = "";
  let images = [];
  let getImage = fetch(
    `https://pixabay.com/api/?key=12324767-03cc86c9530ba2401e568a998&q=${value}&lang=it&per_page=20`
  )
    .then(res => res.json())
    .then(({ hits }) => {
      images = hits;
    });
  let getAudio = Promise.resolve({
    word: "vorrei",
    pathogg:
      "https://apifree.forvo.com/audio/2j2c1i21273m1f1p241g353p3e1o213c2h1l2o2n2f222a1f3n1m1h2b233j3q352k2m3n2o363l2l1p25232f2o222l2q1f2j1n1p2n243a3j3e3j2l3j3q2k3a333k_2j3o1b2q23231h2h3g233e2f3e333d312k1h3k281i3n1t1t"
  });
  let choosed = [];
  let handleClickImage = (image, ind) => {
    if (choosed.some(c => c.image === image)) {
      choosed = choosed.filter(c => c.image !== image);
    } else {
      choosed = [...choosed, { image, ind }];
    }
  };
  let hasChoosed = ind => c => c.ind == ind;
</script>

<style>
  p {
    margin-bottom: 20px;
  }
  .active {
    outline: 3px solid #85fafa;
  }
  input.input {
    width: 221;
    border: none;
    border-bottom: 2px solid #50e3c2;
    background: none;
    outline: none;
    font-size: 14px;
    line-height: 24px;
    margin-bottom: 26px;
    border-radius: 0;
  }
  input.mini {
    border: none;
    border-bottom: 1px solid #333;
    background: none;
    outline: none;
    font-size: 14px;
    margin-left: 10px;
    width: 54px;
    border-radius: 0;
  }
  .images-container {
    margin: 0 -25px 20px -25px;
    padding: 0 25px;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }
  .images-container::-webkit-scrollbar {
    display: none;
  }
  .row {
    display: flex;
    margin-bottom: 12px;
  }
  .image {
    margin-right: 12px;
    border-radius: 5px;
    font-size: 0;
  }
  .upload {
    width: 160px;
    min-width: 160px;
    height: 105px;
    background: #eee url('./camera-icon.png') 0 0 no-repeat;
  }
  .search-label {
    margin-bottom: 15px;
  }
  .button {
    width: 106px;
    background: #50e3c2;
    border-radius: 6px;
    height: 35px;
    text-align: center;
    color: #fff;
    border: none;
    font-size: 14px;
    outline: none;
  }
</style>

<div>
  <H1>Создание карточки</H1>
  <input class="input" bind:value placeholder="Введи текст или фразу"/>
  <H2>Выбери картинку</H2>
  <div class="search-label">
    <span>Поиск по слову:</span>
    <input class="mini" {value} />
  </div>
  <div class="images-container">
    <div class="row">
      {#each images.filter((_, i) => i % 2 == 0) as imageMeta, ind}
        <span
          class={choosed.some(hasChoosed(ind)) ? 'image active' : 'image'}
          on:click={() => handleClickImage(imageMeta, ind)}>
          <img height={105} src={imageMeta.previewURL} alt />
        </span>
      {/each}
    </div>
    <div class="row">
      <span class="image upload"></span>
      {#each images.filter((_, i) => i % 2 != 0) as imageMeta, ind}
        <span
          class={choosed.some(hasChoosed(ind)) ? 'image active' : 'image'}
          on:click={() => handleClickImage(imageMeta, ind)}>
          <img height={105} src={imageMeta.previewURL} alt />
        </span>
      {/each}
    </div>
  </div>
  <p>
    {#await getAudio}
      ...loading
    {:then audio}
      <audio src={audio.pathogg} autoplay />
    {:catch error}
      ...ooops
    {/await}
  </p>
  <button class="button">Создать</button>
</div>
